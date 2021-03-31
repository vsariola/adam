# brainlez Coders! : Adam

A 4k intro written by pestis / bC!. `adam.exe` is the official 1080p version
submitted to the competition, everything else in the directory can be deleted
for the competition.

`adam-720.exe` is the 1280 x 720 version, the only version my shitty laptop can
run.

`adam-2160.exe` is the 3180 x 2160 version; I don't know if it's actually
possible to run that version smoothly on any GPU, but I still compiled it for
you so you can try.

Source code: https://github.com/vsariola/adam

Youtube: https://youtu.be/ofY9cYHgwF4

Tested on Windows 10 Enterprise - 64bit.

## Background

[Nosturi](https://fi.wikipedia.org/wiki/Nosturi_(Helsinki)) was a club venue in
Helsinki, Finland, active from ~ 1999 to 2019. It was the go to place for early
morning after parties after the previous venue Lepakko was closed. Among many
others, Nosturi hosted the legendary Illusions after parties; raves starting at
5 am, typically after another "main" event had ended at 4 am.

Nosturi was a former dock-yard magazine. One of the peculiarities of the
building was that its roof could be opened, presumably originally for loading
stuff in and out of the building. In Illusions, the roof was opened towards the
end of the party, a bit before the noon. And that's when it hit you: after 12h+
in neon lights and fog, completely oblivious to the passage of time, you
realize: it's midday out there.

The opening of the roof was the climax of the party and much awaited. This
spawned the rave cry "Katto auki!", translating to "Open roof!". It quickly
catched on, and ravers everywhere were shouting "katto auki!" when things were
getting really wild.

Thus: this intro is about Katto auki!

## Technical

The music was done with [Sointu](https://github.com/vsariola/sointu), my fork of
[4klang](https://github.com/hzdgopher/4klang). To get shaders up and running, I
started with [Leviathan](https://github.com/armak/Leviathan-2.0), but migrated
into using CMake for builds. For development, I wrote a quick Go program to load
the shader and had Sointu sending sync data to that program using RPC. Still,
90% of the shader stuff was done either in
[ShaderToy](https://www.shadertoy.com/) or just by building the intro and
watching it from the beginning to the end :)
[Shader-minifier](https://github.com/laurentlb/Shader_Minifier) and
[Crinkler](https://github.com/runestubbe/Crinkler) were used, automagically
using CMake. Pretty late I also started validating the shaders using
[glslangValidator](https://github.com/KhronosGroup/glslang) during builds, to
make sure that I am not doing anything against the spec in the shader. I also
occasionally manually used
[ShaderAnalyzer](https://gpuopen.com/archived/gpu-shaderanalyzer/) to check that
the shader at least theoretically compiles on ATI. Still, I can only pray it
_looks_ ok on ATI cards; I don't have one to test.

I had implemented tons of new features in Sointu, but could not use all of them,
as they would never fit in a 4k. In this intro, following new stuff since 4klang
was used:
1) Loading samples from gm.dls. An accidental discovery: In gm.dls, that stupid
   laugh sample is followed by a whistle sample. This reminded me of all the
   out-of-tune rave whistles, so what was originally a bug is now a feature :)
2) Compressor. The kick sidechain compresses (ducks) everything else. There's a
   slow level-equalizing compressor and a peak limiter compressor in the main
   signal.
3) Unison oscillators. There's 24 oscillators in that super saw that you hear
   during "Katto auki!".
4) Sync opcode. Any signal can be sent to sync output: envelopes; loadnotes; but
   also filtered loadnotes. These syncs are saved in an array during the
   rendering of the song and when playing the intro, part of that array is
   always sent as uniforms to the shader. These uniforms are then added to
   various places in the shader; to make all lights flash in sync with the
   music. For example, in the first few moments of the intro, you see red spot
   lights that move in sync to the note pitch. This is done with three opcodes
   in Sointu: loadnote, filter (low-pass) & sync.

## Kudos

- Gopher & pOWL / Alcatraz - For 4klang <3 <3 <3
- noby / Prismbeings - For Leviathan & reading the GLSL specs for me
- Iq / RGBA - For the various raymarching / SDF tutorials
- Mentor / TBC & Blueberry / Loonies - For Crinkler
- LLB / Ctrl-Alt-Test - For shader-minifier
- Apollo / bC! - For first version of the Sointu GUI
- Distance / TPOLM - For testing Sointu, bug reports & feature requests

PLUR
