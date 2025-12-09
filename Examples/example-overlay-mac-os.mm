#include <Cocoa/Cocoa.h>

#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>

// Helper function to convert NSBezierPath to CGPathRef
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
        }
    }
    immutablePath = CGPathCreateCopy(path);
    CGPathRelease(path);
    return immutablePath;
}

int main(int argc, const char * argv[]) {
    @autoreleasepool {
    [NSApplication sharedApplication];
        // Get main screen size
        NSScreen *mainScreen = [NSScreen mainScreen];
        NSRect screenFrame = [mainScreen frame];
        CGFloat screenWidth = screenFrame.size.width;
        CGFloat screenHeight = screenFrame.size.height;
        NSRect frame = NSMakeRect(0, 0, screenWidth, screenHeight);
        NSWindow *window = [[NSWindow alloc] initWithContentRect:frame
                                                    styleMask:NSWindowStyleMaskBorderless
                                                        backing:NSBackingStoreBuffered
                                                        defer:NO];
        [window setLevel:NSMainMenuWindowLevel + 1]; // always on top
        [window setOpaque:NO];
        [window setBackgroundColor:[NSColor clearColor]];
        [window setIgnoresMouseEvents:YES];
        [window setCollectionBehavior:NSWindowCollectionBehaviorCanJoinAllSpaces | NSWindowCollectionBehaviorFullScreenAuxiliary];
        
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
        
        CAShapeLayer *shapeLayer = [CAShapeLayer layer];
        shapeLayer.path = CGPathCreateFromNSBezierPath(path);
        shapeLayer.fillColor = [[NSColor clearColor] CGColor];
        shapeLayer.strokeColor = [[NSColor colorWithRed:0.561 green:0.325 blue:0.788 alpha:1.0] CGColor];
        shapeLayer.lineWidth = 5.0;
        
        [borderView.layer addSublayer:shapeLayer];
        [window setContentView:borderView];
        [window makeKeyAndOrderFront:nil];
        
        [NSApp run];
    }
    return 0;

}
