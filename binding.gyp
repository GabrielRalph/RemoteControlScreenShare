{
  "targets": [
    {
      "target_name": "remote_control",
      "sources": [
        "Mac/src/addon.mm"
      ],
      "cflags": [
        "-std=c++17"
      ],
      "xcode_settings": {
        "OTHER_CFLAGS": [
          "-std=c++17"
        ],
        "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "11.0"
      },
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "libraries": [
        "-framework AppKit",
        "-framework QuartzCore",
        "-framework ApplicationServices"
      ]
    }
  ]
}

