# bC! : Adam

Source code for the 4k intro "Adam" by brainlez Coders!

See [dist/README.md](dist/README.md) for more details.

## Prerequisites for building

Following tools should be in path:

1. [Go](https://golang.org/)
2. [Shader-minifier](https://github.com/laurentlb/Shader_Minifier)
3. [Crinkler](https://github.com/runestubbe/Crinkler) Note: As crinkler.exe, not link.exe
4. Optionally: [glslangValidator](https://github.com/KhronosGroup/glslang)

The actual build was done with
[VSCommunity2019](https://visualstudio.microsoft.com/downloads/). Make sure you
also installed [CMake](https://cmake.org/) with it as the build was automated
with CMake.

## Build

1. Open the repository folder using Visual Studio
2. Choose the configuration (min-heavy-1080 is the compo version). Min means minified, light/med/heavy refers to compression level, 720/1080/2160 the resolution.
3. Build & run.

## License

[MIT](LICENSE)