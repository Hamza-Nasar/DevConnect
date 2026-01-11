import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSocketHealth } from "@/lib/socket-server";

/**
 * Health Check API Endpoint
 * Used for monitoring and load balancer health checks
 * 
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    let dbStatus = "unknown";
    let dbLatency = 0;

    try {
      const dbStart = Date.now();
      const db = await getDb();
      await db.command({ ping: 1 });
      dbLatency = Date.now() - dbStart;
      dbStatus = "connected";
    } catch (dbError) {
      dbStatus = "disconnected";
      console.error("Health check - DB error:", dbError);
    }

    // Check WebSocket health
    const socketHealth = getSocketHealth();

    const response = {
      status: (dbStatus === "connected" && socketHealth.status === "connected") ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      uptime: process.uptime(),
      latency: Date.now() - startTime,
      services: {
        database: {
          status: dbStatus,
          latency: dbLatency,
        },
        websocket: {
          status: socketHealth.status,
          connections: socketHealth.connections,
          rooms: socketHealth.rooms,
          uptime: socketHealth.uptime,
        },
        server: {
          status: "running",
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: "MB",
          },
        },
      },
    };

    // Return 200 for healthy, 503 for degraded
    return NextResponse.json(response, {
      status: (dbStatus === "connected" && socketHealth.status === "connected") ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === "development" 
          ? (error as Error).message 
          : "Internal error",
      },
      { status: 503 }
    );
  }
}


