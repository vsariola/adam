package main

import (
	"fmt"
	"io/ioutil"
	"path"
	"runtime"

	"github.com/go-gl/gl/v4.1-core/gl"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/vsariola/sointu/rpc"
)

func init() {
	// This is needed to arrange that main() runs on main thread.
	// See documentation for functions that are only allowed to be called from the main thread.
	runtime.LockOSThread()
}

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
	checkGLError()

	testProgram, err := loadShaders(testFragmentShader, singleQuadVertexShader)
	if err != nil {
		panic(err)
	}
	program := testProgram

	_, myname, _, _ := runtime.Caller(0)
	filename := path.Join(path.Dir(myname), "..", "data", "shader.frag")

	shaderSourceBytes, err := ioutil.ReadFile(filename)
	if err != nil {
		panic(err)
	}

	program, err = loadShaders(string(shaderSourceBytes), singleQuadVertexShader)
	if err != nil {
		fmt.Printf("error loading %v: %v\n%v\n", filename, err, getGLProgramInfoLog(program))
		program = testProgram
	}
	gl.UseProgram(program)
	if err := getGLError(); err != nil {
		fmt.Println("CANNOT USE", err, "\n", getGLProgramInfoLog(program))
	}

	window.SetFramebufferSizeCallback(func(w *glfw.Window, width, height int) {
		gl.Viewport(0, 0, int32(width), int32(height))
	})

	uname, usize, uxtype := getGLUniformInformation(program, 0)
	fmt.Println("uniform#0", uname, usize, uxtype)
	if usize == 0 {
		fmt.Println("UNIFORM 0 NOT FOUND!!")
	} else {
		arr := make([]float32, usize)
		gl.Uniform1fv(0, usize, &arr[0])
		if err := getGLError(); err != nil {
			fmt.Println("UNIFORM 0 ERROR", err)
		}
	}

	for !window.ShouldClose() {
		select {
		case msg := <-receiver:
			l := int32(len(msg))
			if l > usize {
				l = usize
			}
			gl.Uniform1fv(0, l, &msg[0])
		default:
		}
		gl.DrawArrays(gl.TRIANGLE_STRIP, 0, 4)
		checkGLError()
		window.SwapBuffers()
		glfw.PollEvents()
		checkGLError()
	}
}
