package main

import (
	"fmt"
	"github.com/go-gl/gl/v4.1-core/gl"
	"runtime"
	"strings"
)

type glErrorMessage struct {
	Enum    string
	Code    uint32
	Message string
}

func (g glErrorMessage) String() string {
	return fmt.Sprintf("%v [%x]: %v", g.Enum, g.Code, g.Message)
}

func (g glErrorMessage) Error() string {
	return fmt.Sprintf("%v [%x]: %v", g.Enum, g.Code, g.Message)
}

var glErrorMessages = []glErrorMessage{
	{"GL_INVALID_ENUM", 0x0500, "Given when an enumeration parameter is not a legal enumeration for that function. This is given only for local problems; if the spec allows the enumeration in certain circumstances, where other parameters or state dictate those circumstances, then GL_INVALID_OPERATION is the result instead."},
	{"GL_INVALID_VALUE", 0x0501, "Given when a value parameter is not a legal value for that function. This is only given for local problems; if the spec allows the value in certain circumstances, where other parameters or state dictate those circumstances, then GL_INVALID_OPERATION is the result instead."},
	{"GL_INVALID_OPERATION", 0x0502, "Given when the set of state for a command is not legal for the parameters given to that command. It is also given for commands where combinations of parameters define what the legal parameters are."},
	{"GL_STACK_OVERFLOW", 0x0503, "Given when a stack pushing operation cannot be done because it would overflow the limit of that stack's size."},
	{"GL_STACK_UNDERFLOW", 0x0504, "Given when a stack popping operation cannot be done because the stack is already at its lowest point."},
	{"GL_OUT_OF_MEMORY", 0x0505, "Given when performing an operation that can allocate memory, and the memory cannot be allocated. The results of OpenGL functions that return this error are undefined; it is allowable for partial execution of an operation to happen in this circumstance."},
	{"GL_INVALID_FRAMEBUFFER_OPERATION", 0x0506, "Given when doing anything that would attempt to read from or write/render to a framebuffer that is not complete."},
	{"GL_CONTEXT_LOST", 0x0507, "Given if the OpenGL context has been lost, due to a graphics card reset."},
	{"GL_TABLE_TOO_LARGE1", 0x8031, "Part of the ARB_imaging extension."},
}

func getGlErrorMessage(code uint32) glErrorMessage {
	for _, gle := range glErrorMessages {
		if gle.Code == code {
			return gle
		}
	}
	return glErrorMessage{"GL_UNKNOWN_ERROR", code, "Unknown OpenGL error"}
}

func checkGLError() {
	glErr := gl.GetError()
	if glErr != gl.NO_ERROR {
		_, file, line, _ := runtime.Caller(1)
		fmt.Println("ERROR @", fmt.Sprintf("%v:%d", file, line), getGlErrorMessage(glErr))
	}
}

func getGLError() error {
	glErr := gl.GetError()
	if glErr != gl.NO_ERROR {
		_, file, line, _ := runtime.Caller(1)
		return fmt.Errorf("GLError %v:%d : %w", file, line, getGlErrorMessage(glErr))
	}
	return nil
}

func getGLUniformInformation(program, index uint32) (name string, size int32, xtype uint32) {
	var length int32
	nameb := make([]uint8, 64)
	gl.GetActiveUniform(program, index, 64, &length, &size, &xtype, &nameb[0])
	checkGLError()
	return string(nameb[0:length]), size, xtype

}

func getGLProgramInfoLog(program uint32) string {
	var logLength int32
	gl.GetProgramiv(program, gl.INFO_LOG_LENGTH, &logLength)
	if logLength <= 0 {
		return ""
	}
	log := strings.Repeat("\x00", int(logLength))
	gl.GetProgramInfoLog(program, logLength, nil, gl.Str(log))
	return log[:logLength]
}

func compileShader(source string, shaderType uint32) (uint32, error) {
	shader := gl.CreateShader(shaderType)

	csources, free := gl.Strs(source)
	gl.ShaderSource(shader, 1, csources, nil)
	free()
	gl.CompileShader(shader)

	var status int32
	gl.GetShaderiv(shader, gl.COMPILE_STATUS, &status)
	if status == gl.FALSE {
		var logLength int32
		gl.GetShaderiv(shader, gl.INFO_LOG_LENGTH, &logLength)

		log := strings.Repeat("\x00", int(logLength+1))
		gl.GetShaderInfoLog(shader, logLength, nil, gl.Str(log))

		return 0, fmt.Errorf("failed to compile %v: %v", source, log)
	}

	return shader, nil
}

func loadShaders(fragment, vertex string) (uint32, error) {
	program := gl.CreateProgram()
	// that \x00 null termination is important, crashes otherwise
	fragmentShader, err := compileShader(fragment+"\x00", gl.FRAGMENT_SHADER)
	if err != nil {
		return 0, fmt.Errorf("cannot compile fragment shader: %w", err)
	}
	// that \x00 null termination is important, crashes otherwise
	vertexShader, err := compileShader(vertex+"\x00", gl.VERTEX_SHADER)
	if err != nil {
		return 0, fmt.Errorf("cannot compile vertex shader: %w", err)
	}
	gl.AttachShader(program, fragmentShader)
	gl.AttachShader(program, vertexShader)
	gl.LinkProgram(program)
	if err := getGLError(); err != nil {
		return 0, fmt.Errorf("cannot link: %w", err)
	}
	gl.DeleteShader(fragmentShader)
	gl.DeleteShader(vertexShader)
	if err := getGLError(); err != nil {
		return 0, fmt.Errorf("cannot delete vertex shader: %w", err)
	}
	return program, nil
}

const testFragmentShader string = `
#version 400
out vec4 colorOut;
uniform float syncs[5]; 

void main()
{
	vec2 res = vec2(1280,720);
	vec2 q = gl_FragCoord.xy/res.xy;
    colorOut = vec4(q, 0.5, 1.0);
}
`

const singleQuadVertexShader string = `
#version 400
out vec2 textureCoords;

void main() {
    const vec2 positions[4] = vec2[](
        vec2(-1, -1),
        vec2(+1, -1),
        vec2(-1, +1),
        vec2(+1, +1)
    );
    const vec2 coords[4] = vec2[](
        vec2(0, 0),
        vec2(1, 0),
        vec2(0, 1),
        vec2(1, 1)
    );

    textureCoords = coords[gl_VertexID];
    gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}`
