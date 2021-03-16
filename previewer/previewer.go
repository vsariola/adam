package main

import (
	"fmt"
	"io/ioutil"
	"path"
	"runtime"
	"strings"

	"github.com/go-gl/gl/v4.1-core/gl"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/vsariola/sointu/rpc"
)

func init() {
	// This is needed to arrange that main() runs on main thread.
	// See documentation for functions that are only allowed to be called from the main thread.
	runtime.LockOSThread()
}

const MAX_SYNCS = 5

func main() {
	receiver, err := rpc.Receiver()
	if err != nil {
		panic(err)
	}
	err = glfw.Init()
	if err != nil {
		panic(err)
	}
	defer glfw.Terminate()

	glfw.WindowHint(glfw.Resizable, glfw.True)
	//glfw.WindowHint(glfw.ContextVersionMajor, 4)
	//glfw.WindowHint(glfw.ContextVersionMinor, 1)
	//glfw.WindowHint(glfw.OpenGLProfile, glfw.OpenGLCoreProfile)
	//glfw.WindowHint(glfw.OpenGLForwardCompatible, glfw.True)
	window, err := glfw.CreateWindow(1280, 720, "Sointu Sync Preview", nil, nil)
	if err != nil {
		panic(err)
	}

	window.MakeContextCurrent()

	// Initialize Glow
	if err := gl.Init(); err != nil {
		panic(err)
	}

	version := gl.GoStr(gl.GetString(gl.VERSION))
	fmt.Println("OpenGL version", version)

	_, myname, _, _ := runtime.Caller(0)
	shaderPath := path.Join(path.Dir(myname), "..", "data", "shader.frag")
	shaderSourceBytes, err := ioutil.ReadFile(shaderPath)
	if err != nil {
		panic(err)
	}
	// that \x00 null termination is important, crashes otherwise
	shaderSource := string(shaderSourceBytes) + "\x00"
	//shaderSource := testFragmentShader

	program := gl.CreateProgram()

	fragmentShader, err := compileShader(shaderSource, gl.FRAGMENT_SHADER)
	if err != nil {
		panic(err)
	}
	vertexShader, err := compileShader(string(singleQuadVertexShader), gl.VERTEX_SHADER)
	if err != nil {
		panic(err)
	}
	gl.AttachShader(program, fragmentShader)
	gl.AttachShader(program, vertexShader)
	gl.LinkProgram(program)
	gl.DeleteShader(fragmentShader)
	gl.DeleteShader(vertexShader)
	gl.UseProgram(program)

	window.SetFramebufferSizeCallback(func(w *glfw.Window, width, height int) {
		gl.Viewport(0, 0, int32(width), int32(height))
	})

	arr := make([]float32, MAX_SYNCS)
	gl.Uniform1fv(0, MAX_SYNCS, &arr[0])
	for !window.ShouldClose() {
		select {
		case msg := <-receiver:
			l := int32(len(msg))
			if l > MAX_SYNCS {
				l = MAX_SYNCS
			}
			gl.Uniform1fv(0, l, &msg[0])
		default:
		}
		gl.DrawArrays(gl.TRIANGLE_STRIP, 0, 4)
		window.SwapBuffers()
		glfw.PollEvents()
	}
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

const testFragmentShader string = `
#version 330
out vec4 colorOut;

void main()
{
	vec2 res = vec2(1280,720);
	vec2 q = gl_FragCoord.xy/res.xy;
    colorOut = vec4(q, 0.0, 1.0);
}
` + "\x00"

const singleQuadVertexShader string = `
#version 300 es
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
}` + "\x00"
