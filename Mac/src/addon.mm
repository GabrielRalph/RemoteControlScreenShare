#import <Foundation/Foundation.h>
#import <ApplicationServices/ApplicationServices.h>
#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>
#import <dispatch/dispatch.h>
#include <unistd.h>

#include <napi.h>

namespace {

/**
 * Convert screen coordinates to CGPoint
 * Uses global screen coordinates with origin at top-left
 */
CGPoint ToCGPoint(double x, double y) {
  return CGPointMake(x, y);
}

bool gLeftDown = false;

/**
 * Warp cursor to target position
 */
void WarpCursor(CGPoint point) {
  CGWarpMouseCursorPosition(point);
  CGAssociateMouseAndMouseCursorPosition(true);
}

CGPoint CurrentCursorPos() {
  CGEventRef event = CGEventCreate(nullptr);
  CGPoint loc = CGEventGetLocation(event);
  CFRelease(event);
  return loc;
}

CGEventRef CreateMouseEvent(CGEventType type, CGPoint point, double pressure = -1.0) {
  CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
  CGEventRef event = CGEventCreateMouseEvent(source, type, point, kCGMouseButtonLeft);
  if (source) CFRelease(source);
  if (!event) return nullptr;
  CGEventSetIntegerValueField(event, kCGMouseEventButtonNumber, kCGMouseButtonLeft);
  CGEventSetIntegerValueField(event, kCGMouseEventClickState, 1);
  if (pressure >= 0) {
    CGEventSetDoubleValueField(event, kCGMouseEventPressure, pressure);
  }
  return event;
}

void PostMouseEvent(CGEventType type, CGPoint point) {
  CGEventRef event = CreateMouseEvent(type, point);
  if (!event) return;
  CGEventPost(kCGHIDEventTap, event);
  CFRelease(event);
}

/**
 * Post mouse event with pressure value at absolute coordinates
 * Uses HID EventTap for reliable event delivery
 */
void PostMouseEventAbsoluteWithPressure(CGEventType type, double x, double y, double pressure) {
  CGPoint p = ToCGPoint(x, y);
  CGEventRef event = CreateMouseEvent(type, p, pressure);
  if (!event) return;
  CGEventPost(kCGHIDEventTap, event);
  CFRelease(event);
  usleep(10000); // 10ms delay to ensure event is processed by the system
}

/**
 * Send drag path from start to end position
 * Segmented dragging to avoid single position jump being ignored by some applications
 */
void SendDragPath(CGPoint from, CGPoint to) {
  int steps = 8;
  for (int i = 1; i <= steps; ++i) {
    double t = (double)i / (double)steps;
    CGPoint p = CGPointMake(from.x + (to.x - from.x) * t,
                            from.y + (to.y - from.y) * t);
    CGEventRef ev = CreateMouseEvent(kCGEventLeftMouseDragged, p, 1.0);
    if (ev) {
      CGEventPost(kCGHIDEventTap, ev);
      CFRelease(ev);
    }
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
  CGPoint p = ToCGPoint(x, y);
  bool isLeftDown = gLeftDown || CGEventSourceButtonState(kCGEventSourceStateCombinedSessionState, kCGMouseButtonLeft);
  if (isLeftDown) {
    CGPoint cur = CurrentCursorPos();
    SendDragPath(cur, p);
    WarpCursor(p);
  } else {
    WarpCursor(p);
    PostMouseEvent(kCGEventMouseMoved, p);
  }
  return env.Undefined();
}

/**
 * NAPI wrapper for mouse down event
 * If coordinates are provided, use them; otherwise use current mouse position
 */
Napi::Value MouseDownWrapped(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  CGPoint p;
  
  if (info.Length() >= 2 && info[0].IsNumber() && info[1].IsNumber()) {
    int x = info[0].As<Napi::Number>().Int32Value();
    int y = info[1].As<Napi::Number>().Int32Value();
    p = CGPointMake(x, y);
  } else {
    p = CurrentCursorPos();
  }
  
  CGEventRef e = CGEventCreateMouseEvent(
      NULL, kCGEventLeftMouseDown, p, kCGMouseButtonLeft
  );
  CGEventPost(kCGHIDEventTap, e);
  CFRelease(e);
  
  return env.Undefined();
}

/**
 * NAPI wrapper for mouse up event
 * If coordinates are provided, use them; otherwise use current mouse position
 */
Napi::Value MouseUpWrapped(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  CGPoint p;
  
  if (info.Length() >= 2 && info[0].IsNumber() && info[1].IsNumber()) {
    int x = info[0].As<Napi::Number>().Int32Value();
    int y = info[1].As<Napi::Number>().Int32Value();
    p = CGPointMake(x, y);
  } else {
    p = CurrentCursorPos();
  }
  
  CGEventRef e = CGEventCreateMouseEvent(
      NULL, kCGEventLeftMouseUp, p, kCGMouseButtonLeft
  );
  CGEventPost(kCGHIDEventTap, e);
  CFRelease(e);
  
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
  CGPoint p = ToCGPoint(x, y);
  WarpCursor(p);
  // Send down and up events with pressure values to ensure event recognition
  // Add small delay to ensure down event is processed before sending up event
  PostMouseEventAbsoluteWithPressure(kCGEventLeftMouseDown, x, y, 1.0);
  usleep(20000); // 20ms delay to simulate real click
  PostMouseEventAbsoluteWithPressure(kCGEventLeftMouseUp, x, y, 0.0);
  return env.Undefined();
}

// Helper function to convert NSBezierPath to CGPathRef (from example)
CGPathRef CGPathCreateFromNSBezierPath(NSBezierPath *bezierPath) {
  NSInteger i, numElements;
  CGPathRef immutablePath = NULL;
  numElements = [bezierPath elementCount];
  if (numElements == 0) return NULL;

  CGMutablePathRef path = CGPathCreateMutable();
  NSPoint points[3];

  for (i = 0; i < numElements; i++) {
    switch ([bezierPath elementAtIndex:i associatedPoints:points]) {
      case NSMoveToBezierPathElement:
        CGPathMoveToPoint(path, NULL, points[0].x, points[0].y);
        break;
      case NSLineToBezierPathElement:
        CGPathAddLineToPoint(path, NULL, points[0].x, points[0].y);
        break;
      case NSCurveToBezierPathElement:
        CGPathAddCurveToPoint(path, NULL,
                            points[0].x, points[0].y,
                            points[1].x, points[1].y,
                            points[2].x, points[2].y);
        break;
      case NSClosePathBezierPathElement:
        CGPathCloseSubpath(path);
        break;
      default:
        break;
    }
  }
  immutablePath = CGPathCreateCopy(path);
  CGPathRelease(path);
  return immutablePath;
}

/**
 * Overlay window management
 * Global overlay window instance
 */
NSWindow* gOverlayWindow = nil;

/**
 * Create overlay window with rounded top corners border
 * Ensures NSApplication is initialized on main thread
 */
void CreateOverlayWindow() {
  if (gOverlayWindow) {
    [gOverlayWindow orderFrontRegardless];
    return;
  }

  // Ensure NSApplication is initialized on main thread
  if (![NSThread isMainThread]) {
    dispatch_sync(dispatch_get_main_queue(), ^{
      CreateOverlayWindow();
    });
    return;
  }

  [NSApplication sharedApplication];
  [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
  [NSApp activateIgnoringOtherApps:YES];

  // Get main screen size
  NSScreen *mainScreen = [NSScreen mainScreen];
  NSRect screenFrame = [mainScreen frame];
  CGFloat screenWidth = screenFrame.size.width;
  CGFloat screenHeight = screenFrame.size.height;
  NSRect frame = NSMakeRect(0, 0, screenWidth, screenHeight);
  
  gOverlayWindow = [[NSWindow alloc] initWithContentRect:frame
                                                styleMask:NSWindowStyleMaskBorderless
                                                  backing:NSBackingStoreBuffered
                                                    defer:NO];
  // Window level settings: always on top
  [gOverlayWindow setLevel:NSMainMenuWindowLevel + 1];
  [gOverlayWindow setOpaque:NO];
  [gOverlayWindow setBackgroundColor:[NSColor clearColor]];
  [gOverlayWindow setIgnoresMouseEvents:YES];
  [gOverlayWindow setCollectionBehavior:NSWindowCollectionBehaviorCanJoinAllSpaces |
                                        NSWindowCollectionBehaviorFullScreenAuxiliary];

  NSView *borderView = [[NSView alloc] initWithFrame:frame];
  [borderView setWantsLayer:YES];

  // Create path with top corners rounded
  CGFloat radius = 20.0;
  NSBezierPath *path = [NSBezierPath bezierPath];
  [path moveToPoint:NSMakePoint(0, 0)];
  [path lineToPoint:NSMakePoint(0, frame.size.height - radius)];
  [path curveToPoint:NSMakePoint(radius, frame.size.height)
      controlPoint1:NSMakePoint(0, frame.size.height)
      controlPoint2:NSMakePoint(radius, frame.size.height)];
  [path lineToPoint:NSMakePoint(frame.size.width - radius, frame.size.height)];
  [path curveToPoint:NSMakePoint(frame.size.width, frame.size.height - radius)
      controlPoint1:NSMakePoint(frame.size.width - radius, frame.size.height)
      controlPoint2:NSMakePoint(frame.size.width, frame.size.height)];
  [path lineToPoint:NSMakePoint(frame.size.width, 0)];
  [path closePath];

  // Convert NSBezierPath to CGPathRef using helper function
  CAShapeLayer *shapeLayer = [CAShapeLayer layer];
  shapeLayer.path = CGPathCreateFromNSBezierPath(path);
  shapeLayer.fillColor = [[NSColor clearColor] CGColor];
  shapeLayer.strokeColor = [[NSColor colorWithRed:0.561 green:0.325 blue:0.788 alpha:1.0] CGColor];
  shapeLayer.lineWidth = 5.0;

  [borderView.layer addSublayer:shapeLayer];
  [gOverlayWindow setContentView:borderView];
  [gOverlayWindow makeKeyAndOrderFront:nil];
  
  // Process one event loop iteration to ensure window is displayed (non-blocking)
  NSEvent* event = [NSApp nextEventMatchingMask:NSEventMaskAny
                                        untilDate:[NSDate distantPast]
                                           inMode:NSDefaultRunLoopMode
                                          dequeue:NO];
  if (event) {
    [NSApp sendEvent:event];
  }
}

/**
 * NAPI wrapper for creating overlay window
 * Ensures execution on main thread for proper window display
 */
Napi::Value CreateOverlayWrapped(const Napi::CallbackInfo& info) {
  if ([NSThread isMainThread]) {
    CreateOverlayWindow();
  } else {
    dispatch_sync(dispatch_get_main_queue(), ^{
      CreateOverlayWindow();
    });
  }
  return info.Env().Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("click", Napi::Function::New(env, ClickWrapped));
  exports.Set("move", Napi::Function::New(env, MoveWrapped));
  exports.Set("mouseDown", Napi::Function::New(env, MouseDownWrapped));
  exports.Set("mouseUp", Napi::Function::New(env, MouseUpWrapped));
  exports.Set("createOverlayFrame", Napi::Function::New(env, CreateOverlayWrapped));
  return exports;
}

}  // namespace

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)

