#include <windows.h>
#include <napi.h>
#include <thread>
#include <chrono>

namespace {

/**
 * Convert screen coordinates to POINT
 * Uses global screen coordinates with origin at top-left
 */
POINT ToPoint(double x, double y) {
  POINT p;
  p.x = static_cast<LONG>(x);
  p.y = static_cast<LONG>(y);
  return p;
}

bool gLeftDown = false;

/**
 * Move cursor to target position
 */
void MoveCursor(POINT point) {
  SetCursorPos(point.x, point.y);
}

POINT CurrentCursorPos() {
  POINT p;
  GetCursorPos(&p);
  return p;
}

/**
 * Send mouse input event
 */
void SendMouseInput(DWORD flags, LONG dx = 0, LONG dy = 0) {
  INPUT input = {0};
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = flags;
  input.mi.dx = dx;
  input.mi.dy = dy;
  input.mi.mouseData = 0;
  input.mi.dwExtraInfo = 0;
  input.mi.time = 0;
  SendInput(1, &input, sizeof(INPUT));
}

/**
 * Send mouse event at absolute coordinates
 */
void SendMouseEventAbsolute(DWORD flags, double x, double y) {
  // Convert to normalized absolute coordinates (0-65535)
  int screenWidth = GetSystemMetrics(SM_CXSCREEN);
  int screenHeight = GetSystemMetrics(SM_CYSCREEN);
  
  LONG normalizedX = static_cast<LONG>((x * 65535) / screenWidth);
  LONG normalizedY = static_cast<LONG>((y * 65535) / screenHeight);
  
  INPUT input = {0};
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = flags | MOUSEEVENTF_ABSOLUTE;
  input.mi.dx = normalizedX;
  input.mi.dy = normalizedY;
  input.mi.mouseData = 0;
  input.mi.dwExtraInfo = 0;
  input.mi.time = 0;
  SendInput(1, &input, sizeof(INPUT));
  
  std::this_thread::sleep_for(std::chrono::milliseconds(10));
}

/**
 * Send drag path from start to end position
 * Segmented dragging to avoid single position jump being ignored by some applications
 */
void SendDragPath(POINT from, POINT to) {
  int steps = 8;
  for (int i = 1; i <= steps; ++i) {
    double t = static_cast<double>(i) / static_cast<double>(steps);
    LONG x = static_cast<LONG>(from.x + (to.x - from.x) * t);
    LONG y = static_cast<LONG>(from.y + (to.y - from.y) * t);
    
    SetCursorPos(x, y);
    SendMouseInput(MOUSEEVENTF_MOVE);
    std::this_thread::sleep_for(std::chrono::milliseconds(5));
  }
}

Napi::Value MoveWrapped(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "move(x, y) expects two numbers").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  double x = info[0].As<Napi::Number>().DoubleValue();
  double y = info[1].As<Napi::Number>().DoubleValue();
  POINT p = ToPoint(x, y);
  
  // Check if left button is currently down
  bool isLeftDown = gLeftDown || (GetAsyncKeyState(VK_LBUTTON) & 0x8000);
  
  if (isLeftDown) {
    POINT cur = CurrentCursorPos();
    SendDragPath(cur, p);
  } else {
    MoveCursor(p);
    SendMouseInput(MOUSEEVENTF_MOVE);
  }
  return env.Undefined();
}

/**
 * NAPI wrapper for mouse down event
 * If coordinates are provided, use them; otherwise use current mouse position
 */
Napi::Value MouseDownWrapped(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() >= 2 && info[0].IsNumber() && info[1].IsNumber()) {
    double x = info[0].As<Napi::Number>().DoubleValue();
    double y = info[1].As<Napi::Number>().DoubleValue();
    MoveCursor(ToPoint(x, y));
  }
  
  gLeftDown = true;
  SendMouseInput(MOUSEEVENTF_LEFTDOWN);
  
  return env.Undefined();
}

/**
 * NAPI wrapper for mouse up event
 * If coordinates are provided, use them; otherwise use current mouse position
 */
Napi::Value MouseUpWrapped(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() >= 2 && info[0].IsNumber() && info[1].IsNumber()) {
    double x = info[0].As<Napi::Number>().DoubleValue();
    double y = info[1].As<Napi::Number>().DoubleValue();
    MoveCursor(ToPoint(x, y));
  }
  
  gLeftDown = false;
  SendMouseInput(MOUSEEVENTF_LEFTUP);
  
  return env.Undefined();
}

Napi::Value ClickWrapped(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "click(x, y) expects two numbers").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  double x = info[0].As<Napi::Number>().DoubleValue();
  double y = info[1].As<Napi::Number>().DoubleValue();
  POINT p = ToPoint(x, y);
  
  MoveCursor(p);
  std::this_thread::sleep_for(std::chrono::milliseconds(10));
  
  // Send down and up events with delays to simulate real click
  SendMouseInput(MOUSEEVENTF_LEFTDOWN);
  std::this_thread::sleep_for(std::chrono::milliseconds(20));
  SendMouseInput(MOUSEEVENTF_LEFTUP);
  
  return env.Undefined();
}

/**
 * Get current mouse position
 */
Napi::Value GetMousePosWrapped(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  POINT p = CurrentCursorPos();
  
  Napi::Object result = Napi::Object::New(env);
  result.Set("x", Napi::Number::New(env, p.x));
  result.Set("y", Napi::Number::New(env, p.y));
  
  return result;
}

/**
 * Get screen dimensions
 */
Napi::Value GetScreenSizeWrapped(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  int width = GetSystemMetrics(SM_CXSCREEN);
  int height = GetSystemMetrics(SM_CYSCREEN);
  
  Napi::Object result = Napi::Object::New(env);
  result.Set("width", Napi::Number::New(env, width));
  result.Set("height", Napi::Number::New(env, height));
  
  return result;
}

/**
 * Overlay window management using Windows API
 */
HWND gOverlayWindow = NULL;
HBRUSH gBorderBrush = NULL;

LRESULT CALLBACK OverlayWndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
  switch (msg) {
    case WM_PAINT: {
      PAINTSTRUCT ps;
      HDC hdc = BeginPaint(hwnd, &ps);
      
      // Get window dimensions
      RECT rect;
      GetClientRect(hwnd, &rect);
      
      // Create purple pen for border
      HPEN hPen = CreatePen(PS_SOLID, 5, RGB(143, 83, 201)); // #8F53C9
      HPEN hOldPen = (HPEN)SelectObject(hdc, hPen);
      
      // Set transparent background
      SelectObject(hdc, GetStockObject(NULL_BRUSH));
      
      // Draw rounded rectangle border
      int radius = 20;
      RoundRect(hdc, 0, 0, rect.right, rect.bottom, radius, radius);
      
      SelectObject(hdc, hOldPen);
      DeleteObject(hPen);
      
      EndPaint(hwnd, &ps);
      return 0;
    }
    case WM_DESTROY:
      PostQuitMessage(0);
      return 0;
    default:
      return DefWindowProc(hwnd, msg, wParam, lParam);
  }
}

/**
 * Create overlay window with rounded border
 * Runs in a separate thread to avoid blocking
 */
/**
 * Create overlay window with rounded border
 * Runs in a separate thread to avoid blocking
 */
void CreateOverlayWindowThread() {
  HINSTANCE hInstance = GetModuleHandle(NULL);
  
  // Register window class
  WNDCLASSEXW wc = {0};
  wc.cbSize = sizeof(WNDCLASSEXW);
  wc.lpfnWndProc = OverlayWndProc;
  wc.hInstance = hInstance;
  wc.lpszClassName = L"OverlayWindowClass";
  wc.hbrBackground = (HBRUSH)GetStockObject(NULL_BRUSH);
  
  if (!RegisterClassExW(&wc)) {
    DWORD error = GetLastError();
    if (error != ERROR_CLASS_ALREADY_EXISTS) {
      return;
    }
  }
  
  // Get screen dimensions
  int screenWidth = GetSystemMetrics(SM_CXSCREEN);
  int screenHeight = GetSystemMetrics(SM_CYSCREEN);
  
  // Create layered window
  gOverlayWindow = CreateWindowExW(
    WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
    L"OverlayWindowClass",
    L"Overlay",
    WS_POPUP,
    0, 0, screenWidth, screenHeight,
    NULL, NULL, hInstance, NULL
  );
  
  if (!gOverlayWindow) {
    return;
  }
  
  // Make window transparent and click-through
  SetLayeredWindowAttributes(gOverlayWindow, RGB(0, 0, 0), 0, LWA_COLORKEY);
  SetLayeredWindowAttributes(gOverlayWindow, 0, 230, LWA_ALPHA);
  
  ShowWindow(gOverlayWindow, SW_SHOW);
  UpdateWindow(gOverlayWindow);
  
  // Message loop (non-blocking, just process existing messages)
  MSG msg;
  while (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }
}

/**
 * NAPI wrapper for creating overlay window
 */
Napi::Value CreateOverlayWrapped(const Napi::CallbackInfo& info) {
  if (gOverlayWindow) {
    ShowWindow(gOverlayWindow, SW_SHOW);
    SetWindowPos(gOverlayWindow, HWND_TOPMOST, 0, 0, 0, 0, 
                 SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
  } else {
    std::thread(CreateOverlayWindowThread).detach();
  }
  return info.Env().Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("click", Napi::Function::New(env, ClickWrapped));
  exports.Set("move", Napi::Function::New(env, MoveWrapped));
  exports.Set("mouseDown", Napi::Function::New(env, MouseDownWrapped));
  exports.Set("mouseUp", Napi::Function::New(env, MouseUpWrapped));
  exports.Set("getMousePos", Napi::Function::New(env, GetMousePosWrapped));
  exports.Set("getScreenSize", Napi::Function::New(env, GetScreenSizeWrapped));
  exports.Set("createOverlayFrame", Napi::Function::New(env, CreateOverlayWrapped));
  return exports;
}

}  // namespace

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
