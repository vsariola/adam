#define POST_PASS    0
#define USE_MIPMAPS  1
#define FAIL_KILL true
#define PID_QUALIFIER const

// minify windows.h
#define WIN32_LEAN_AND_MEAN
#define WIN32_EXTRA_LEAN
#define VC_LEANMEAN
#define VC_EXTRALEAN
#include <windows.h>
#include <mmsystem.h>
#include <mmreg.h>
#include <GL/gl.h>

#include "debug.h"

#include "glext.h"
#include <song.h>
#include <shader.inl>
#if POST_PASS
#include <post.inl>
#endif

#pragma data_seg(".pixelfmt")
static const PIXELFORMATDESCRIPTOR pfd = {
#if BREAK_COMPATIBILITY
	#if POST_PASS
			0, 0, PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER, PFD_TYPE_RGBA,
			0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, PFD_MAIN_PLANE, 0, 0, 0, 0
	#else
			0, 0, PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER, PFD_TYPE_RGBA,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, PFD_MAIN_PLANE, 0, 0, 0, 0
	#endif
#else
	sizeof(pfd), 1, PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER, PFD_TYPE_RGBA,
	32, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 32, 0, 0, PFD_MAIN_PLANE, 0, 0, 0, 0
#endif
};

#pragma data_seg(".screensettings")
static DEVMODE screenSettings = {
	{0}, 0, 0, sizeof(screenSettings), 0, DM_PELSWIDTH | DM_PELSHEIGHT,
	{0}, 0, 0, 0, 0, 0, {0}, 0, 0, XRES, YRES, 0, 0,
	#if(WINVER >= 0x0400)
		0, 0, 0, 0, 0, 0,
			#if (WINVER >= 0x0500) || (_WIN32_WINNT >= 0x0400)
			0, 0
		#endif
	#endif
};

#pragma data_seg(".sointu_buffer")
SUsample sointu_buffer[SU_BUFFER_LENGTH];
float syncBuf[SU_SYNCBUFFER_LENGTH];
HWAVEOUT hWaveOut;

#pragma data_seg(".wavefmt")
static WAVEFORMATEX WaveFMT =
{
#ifdef SU_SAMPLE_FLOAT
	WAVE_FORMAT_IEEE_FLOAT,
#else
	WAVE_FORMAT_PCM,
#endif		
	2,                                   // channels
	SU_SAMPLE_RATE,                         // samples per sec
	SU_SAMPLE_RATE * sizeof(SUsample) * 2, // bytes per sec
	sizeof(SUsample) * 2,             // block alignment;
	sizeof(SUsample) * 8,             // bits per sample
	0                                    // extension not needed
};

#pragma data_seg(".wavehdr")
static WAVEHDR WaveHDR = {
	(LPSTR)sointu_buffer, SU_BUFFER_LENGTH * sizeof(SUsample), 0, 0, 0, 0, 0, 0
};

static MMTIME MMTime = { TIME_SAMPLES, 0 };

#pragma data_seg(".pids")
// static allocation saves a few bytes
static int pidMain;
static int pidPost;
// static HDC hDC;

void entrypoint(void)
{
#ifdef SU_LOAD_GMDLS
	su_load_gmdls();
#endif
	// Use these lines to dump the data:
	// FILE* f;
	// su_render_song(sointu_buffer);
	// f = fopen("song.raw", "wb");
	// fwrite((void*)sointu_buffer, sizeof(SUsample), SU_BUFFER_LENGTH, f);

	CreateThread(0, 0, (LPTHREAD_START_ROUTINE)su_render_song, sointu_buffer, 0, 0);

	// initialize window
	#ifdef WINDOW
		HWND window = CreateWindow("static", 0, WS_POPUP | WS_VISIBLE, 0, 0, XRES, YRES, 0, 0, 0, 0);
		HDC hDC = GetDC(window);
	#else // full screen, the default behaviour
		ChangeDisplaySettings(&screenSettings, CDS_FULLSCREEN);
		ShowCursor(0);
		const HDC hDC = GetDC(CreateWindow((LPCSTR)0xC018, 0, WS_POPUP | WS_VISIBLE | WS_MAXIMIZE, 0, 0, 0, 0, 0, 0, 0, 0));
	#endif

	// initalize opengl context
	SetPixelFormat(hDC, ChoosePixelFormat(hDC, &pfd), &pfd);
	wglMakeCurrent(hDC, wglCreateContext(hDC));

	// create and compile shader programs
	pidMain = ((PFNGLCREATESHADERPROGRAMVPROC)wglGetProcAddress("glCreateShaderProgramv"))(GL_FRAGMENT_SHADER, 1, &shader_frag);

	CHECK_ERRORS();
#if POST_PASS
	pidPost = ((PFNGLCREATESHADERPROGRAMVPROC)wglGetProcAddress("glCreateShaderProgramv"))(GL_FRAGMENT_SHADER, 1, &post_frag);
#endif	
	waveOutOpen(&hWaveOut, WAVE_MAPPER, &WaveFMT, NULL, 0, CALLBACK_NULL);
	waveOutPrepareHeader(hWaveOut, &WaveHDR, sizeof(WaveHDR));
	waveOutWrite(hWaveOut, &WaveHDR, sizeof(WaveHDR));

	CHECK_ERRORS();


	do
	{
#if !(DESPERATE)
		// do minimal message handling so windows doesn't kill your application
		// not always strictly necessary but increases compatibility and reliability a lot
		// normally you'd pass an msg struct as the first argument but it's just an
		// output parameter and the implementation presumably does a NULL check
		PeekMessage(0, 0, 0, 0, PM_REMOVE);
#endif

		// render with the primary shader
		((PFNGLUSEPROGRAMPROC)wglGetProcAddress("glUseProgram"))(pidMain);
		CHECK_ERRORS();

		waveOutGetPosition(hWaveOut, &MMTime, sizeof(MMTIME));
		

		//GLint loc = ((PFNGLGETUNIFORMLOCATIONPROC)wglGetProcAddress("glGetUniformLocation"))(pidMain, VAR_SYNCS);
		//CHECK_ERRORS();

		//GLfloat f[5];
		//f[0] = (float)MMTime.u.sample / 44100.0f / 60.0f * 144.0f;		
		//f[1] = fmod(f[0], 1.0f);
		// add some offset to time to account for the lag in wave out
		((PFNGLUNIFORM1FVPROC)wglGetProcAddress("glUniform1fv"))(0, 16, &syncBuf[((MMTime.u.sample+16384) >> 8) * SU_NUMSYNCS]);
		CHECK_ERRORS();

		glRects(-1, -1, 1, 1);
		CHECK_ERRORS();


		// render "post process" using the opengl backbuffer
#if POST_PASS
		glBindTexture(GL_TEXTURE_2D, 1);
#if USE_MIPMAPS
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
		glCopyTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, 0, 0, XRES, YRES, 0);
		((PFNGLGENERATEMIPMAPPROC)wglGetProcAddress("glGenerateMipmap"))(GL_TEXTURE_2D);
#else
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
		glCopyTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, 0, 0, XRES, YRES, 0);
#endif
		((PFNGLACTIVETEXTUREPROC)wglGetProcAddress("glActiveTexture"))(GL_TEXTURE0);
		((PFNGLUSEPROGRAMPROC)wglGetProcAddress("glUseProgram"))(pidPost);
		//((PFNGLUNIFORM1IPROC)wglGetProcAddress("glUniform1i"))(0, 0);
		glRects(-1, -1, 1, 1);
#endif

		SwapBuffers(hDC);

	} while (!GetAsyncKeyState(VK_ESCAPE) && MMTime.u.sample < SU_LENGTH_IN_SAMPLES);

	ExitProcess(0);
}
