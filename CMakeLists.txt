cmake_minimum_required(VERSION 3.10)

cmake_policy(SET CMP0091 NEW)

set(CMAKE_VERBOSE_MAKEFILE ON)

project(fourkay-someday
    VERSION 0.0.0
    DESCRIPTION "A base for making a 4k intro... someday"
    LANGUAGES C CXX)

# Only do these if this is the main project, and not if it is included through add_subdirectory
if(CMAKE_PROJECT_NAME STREQUAL PROJECT_NAME)
    # Let's ensure -std=c++xx instead of -std=g++xx
    set(CMAKE_CXX_EXTENSIONS OFF)

    # Let's nicely support folders in IDE's
    set_property(GLOBAL PROPERTY USE_FOLDERS ON)
endif()

# tell nasm that we want 32-bit OBJ file


find_program(GO NAMES go)
if(NOT GO)
  message(FATAL_ERROR "Go not found. Get Go from: https://golang.org")
else()
  message(STATUS "Go found at: ${GO}")
endif()

if("${CMAKE_SIZEOF_VOID_P}" STREQUAL "4")
    set(CMAKE_ASM_NASM_OBJECT_FORMAT win32)
    enable_language(ASM_NASM)
    # remove flags from nasm as the same compile flags were causing trouble
    set(CMAKE_ASM_NASM_COMPILE_OBJECT "<CMAKE_ASM_NASM_COMPILER> <INCLUDES> <DEFINES> -f ${CMAKE_ASM_NASM_OBJECT_FORMAT} -o <OBJECT> <SOURCE>")
    add_subdirectory(intro)
else() 
    enable_language(ASM_NASM)
    add_subdirectory(capture)
endif()
