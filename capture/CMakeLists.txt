if (NOT XRES)
    set(XRES 1920)
endif()
if (NOT YRES)
    set(YRES 1080)
endif()
 
message(STATUS "Configuration options (configure with cmake -D...): WINDOW=${WINDOW} MINIFY_SHADERS=${MINIFY_SHADERS} COMPRESS_LEVEL=${COMPRESS_LEVEL}")

# Compile the Sointu song
set(SONG_ASM song.asm)
set(SONG_YML ../data/song.yml)
set(SOINTU_CMD ${GO} run "github.com/vsariola/sointu/cmd/sointu-compile")
add_custom_command(
    OUTPUT ${SONG_ASM} 
    COMMAND ${SOINTU_CMD} -r -o ${CMAKE_CURRENT_BINARY_DIR}/${SONG_ASM} ${CMAKE_CURRENT_SOURCE_DIR}/${SONG_YML}
    DEPENDS ${SONG_YML}
)

find_program(SHADER_MINIFIER NAMES shader_minifier)
if (NOT SHADER_MINIFIER)
    message(ERROR "Shader_minifier not found. Cannot minify shaders; using always the hand inlined versions (*.inl). Get shader_minifier from: https://www.ctrl-alt-test.fr/glsl-minifier/")                
endif()

message(STATUS "Shader_minifier found at: ${SHADER_MINIFIER}")      
# Generate the minified inlined shaders        
set(SHADER_FRAG ../data/shader.frag)    
set(SHADER_CONFIGURED_FRAG configured/shader.frag)    
set(SHADER_MINIFIED_INL minified/shader.inl)    
configure_file(
    ${SHADER_FRAG}
    ${SHADER_CONFIGURED_FRAG}
)    
add_custom_command(
    OUTPUT ${SHADER_MINIFIED_INL}
    COMMAND ${SHADER_MINIFIER} -o ${CMAKE_CURRENT_BINARY_DIR}/${SHADER_MINIFIED_INL} ${CMAKE_CURRENT_BINARY_DIR}/${SHADER_CONFIGURED_FRAG}
    DEPENDS ${SHADER_CONFIGURED_FRAG}
)    
set(SHADERS ${SHADER_MINIFIED_INL})
set(SHADER_INCLUDE_DIR ${CMAKE_CURRENT_BINARY_DIR}/minified/)    

find_package( OpenCV REQUIRED )
add_executable(capture main.cpp ${SONG_ASM} ${SHADERS})                    
target_compile_definitions(capture PUBLIC XRES=${XRES} YRES=${YRES})
target_link_libraries(capture opengl32.lib winmm.lib)
target_include_directories(capture PUBLIC ${SHADER_INCLUDE_DIR} ${OpenCV_INCLUDE_DIRS}) # for the shaders
target_include_directories(capture PUBLIC ${CMAKE_CURRENT_BINARY_DIR}) # for the song
target_link_libraries(capture ${OpenCV_LIBS})

set(exename "captureadam")
set(exename "${exename}-${YRES}")
set_target_properties(capture PROPERTIES OUTPUT_NAME ${exename})
