#define FPS 60

#include <windows.h>
#include <GL/gl.h>
#include <stdlib.h>
#include <stdio.h>

#include "opencv2/opencv.hpp"
using namespace cv;

// Defining OPENGL_DEBUG makes the CHECK_ERRORS() macro show the error code in messagebox.
// Without the macro, CHECK_ERRORS() is a nop.
#define OPENGL_DEBUG
#include "debug.h"
#include "glext.h"
#include <song.h>
#include <shader.inl>

#pragma data_seg(".pixelfmt")
static const PIXELFORMATDESCRIPTOR pfd = {
	sizeof(pfd), 1, PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER, PFD_TYPE_RGBA,
	32, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 32, 0, 0, PFD_MAIN_PLANE, 0, 0, 0, 0
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
extern "C" {
	float syncBuf[SU_SYNCBUFFER_LENGTH];
}

#pragma data_seg(".wavehdr")
static WAVEHDR WaveHDR = {
	(LPSTR)sointu_buffer, SU_BUFFER_LENGTH * sizeof(SUsample), 0, 0, 0, 0, 0, 0
};
static MMTIME MMTime = { TIME_SAMPLES, 0 };

#pragma data_seg(".pids")
// static allocation saves a few bytes
static int pidMain;
Mat img(YRES, XRES, CV_8UC3); // Create a Mat object, CV_8UC3 = 8 bit + 3 channel ie RGB 24-bit true color
unsigned char pixelBuf[XRES * YRES * 3];


int main() {
	VideoWriter video("output.avi", cv::VideoWriter::fourcc('M', 'J', 'P', 'G'), FPS, Size(XRES, YRES));

#ifdef SU_LOAD_GMDLS
	su_load_gmdls();
#endif
	// Use these lines to dump the data:
	FILE* f;
	su_render_song(sointu_buffer);
	f = fopen("song.raw", "wb");
	fwrite((void*)sointu_buffer, sizeof(SUsample), SU_BUFFER_LENGTH, f);
	fclose(f);

	// full screen, the default behaviour
	ChangeDisplaySettings(&screenSettings, CDS_FULLSCREEN);	
	const HDC hDC = GetDC(CreateWindow((LPCSTR)0xC018, 0, WS_POPUP | WS_VISIBLE | WS_MAXIMIZE, 0, 0, 0, 0, 0, 0, 0, 0));	

	// initalize opengl context
	SetPixelFormat(hDC, ChoosePixelFormat(hDC, &pfd), &pfd);
	wglMakeCurrent(hDC, wglCreateContext(hDC));

	// create and compile shader programs
	pidMain = ((PFNGLCREATESHADERPROGRAMVPROC)wglGetProcAddress("glCreateShaderProgramv"))(GL_FRAGMENT_SHADER, 1, &shader_frag);
	CHECK_ERRORS();

	for (double t = 0; t < double(SU_LENGTH_IN_SAMPLES); t += double(SU_SAMPLE_RATE) / FPS) {	
		PeekMessage(0, 0, 0, 0, PM_REMOVE);
		// render with the primary shader
		((PFNGLUSEPROGRAMPROC)wglGetProcAddress("glUseProgram"))(pidMain);
		CHECK_ERRORS();
		((PFNGLUNIFORM1FVPROC)wglGetProcAddress("glUniform1fv"))(0, 8, &syncBuf[(int(t) >> 8) * SU_NUMSYNCS]);
		CHECK_ERRORS();
		glRects(-1, -1, 1, 1);
		CHECK_ERRORS();
		SwapBuffers(hDC);

		glReadPixels(0, 0, XRES, YRES, GL_RGB, GL_UNSIGNED_BYTE, pixelBuf);
		for (int y = 0; y < YRES; y++) {
			int a = (YRES - y - 1) * XRES * 3;
			int b = y * XRES * 3;
			for (int x = 0; x < XRES; x++)
			{
				img.data[a] = pixelBuf[b+2];
				img.data[a+1] = pixelBuf[b + 1];
				img.data[a+2] = pixelBuf[b];
				a += 3;
				b += 3;
			}
		}
		video.write(img);
	}
	video.release();

	ExitProcess(0);
}
