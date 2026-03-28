import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { JobAgentOrchestrator } from '../utils/JobAgentOrchestrator';
import { LogEntry, PipelineStats } from '../types';

export class WebSocketService {
  private io: SocketIOServer;
  private orchestrators: Map<string, JobAgentOrchestrator> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*', // Configure this properly in production
        methods: ['GET', 'POST']
      }
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle session subscription
      socket.on('subscribe', (sessionId: string) => {
        console.log(`📡 Backend: Client ${socket.id} subscribing to session ${sessionId}`);
        socket.join(sessionId);
        console.log(`📡 Backend: Client ${socket.id} joined room ${sessionId}`);
        
        // Send confirmation
        socket.emit('subscribed', { sessionId });
        console.log(`📡 Backend: Sent subscribed confirmation to client ${socket.id}`);
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (sessionId: string) => {
        console.log(`Client ${socket.id} unsubscribed from session ${sessionId}`);
        socket.leave(sessionId);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Register an orchestrator to emit events through WebSocket
   */
  registerOrchestrator(sessionId: string, orchestrator: JobAgentOrchestrator): void {
    console.log(`📡 Registering orchestrator for session ${sessionId}`);
    this.orchestrators.set(sessionId, orchestrator);

    // Listen to log events
    orchestrator.on('log', (data: any) => {
      console.log(`📤 Emitting log to session ${data.sessionId || sessionId}`);
      this.emitLog(data.sessionId || sessionId, data);
    });

    // Listen to pipeline stats events
    orchestrator.on('pipelineStats', (data: { sessionId: string; stats: PipelineStats }) => {
      console.log(`📤 Emitting pipeline stats to session ${data.sessionId}`);
      this.emitPipelineStats(data.sessionId, data.stats);
    });

    // Listen to intent reasoning events
    orchestrator.on('intentReasoning', (data: any) => {
      console.log(`📤 Emitting intent reasoning to session ${data.sessionId}`);
      this.emitIntentReasoning(data.sessionId, data);
    });

    // Listen to search complete events
    orchestrator.on('searchComplete', (data: any) => {
      console.log(`📤 Emitting search complete to session ${data.sessionId}`);
      this.emitToSession(data.sessionId, 'searchComplete', data);
    });

    // Listen to streaming URL events from TinyFish
    orchestrator.on('streamingUrl', (streamingUrl: string) => {
      console.log(`📤 WebSocketService: Received streamingUrl event from orchestrator`);
      console.log(`📤 Streaming URL: ${streamingUrl}`);
      console.log(`📤 Emitting to session: ${sessionId}`);
      this.emitToSession(sessionId, 'streamingUrl', { streamingUrl });
      console.log(`📤 Emitted streamingUrl to session ${sessionId}`);
    });

    console.log(`✅ Orchestrator registered with all event listeners for session ${sessionId}`);
  }

  /**
   * Emit log entry to all clients subscribed to the session
   */
  emitLog(sessionId: string, logEntry: LogEntry): void {
    this.io.to(sessionId).emit('log', logEntry);
  }

  /**
   * Emit pipeline stats to all clients subscribed to the session
   */
  emitPipelineStats(sessionId: string, stats: PipelineStats): void {
    this.io.to(sessionId).emit('pipelineStats', stats);
  }

  /**
   * Emit intent reasoning to all clients subscribed to the session
   */
  emitIntentReasoning(sessionId: string, data: any): void {
    this.io.to(sessionId).emit('intentReasoning', data);
  }

  /**
   * Emit a custom event to a session
   */
  emitToSession(sessionId: string, event: string, data: any): void {
    this.io.to(sessionId).emit(event, data);
  }

  /**
   * Get the Socket.IO server instance
   */
  getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Unregister an orchestrator
   */
  unregisterOrchestrator(sessionId: string): void {
    const orchestrator = this.orchestrators.get(sessionId);
    if (orchestrator) {
      orchestrator.removeAllListeners();
      this.orchestrators.delete(sessionId);
    }
  }
}
