import { UserProfile, JobListing, LogEntry, PipelineStats, PipelineStage, LogLevel, ApplicationRecord, ApplicationStatus } from '../types';
import { EventEmitter } from 'events';
import { SearchPlanner } from './SearchPlanner';
import { HardFilter } from './HardFilter';
import { IntentEngine } from './IntentEngine';
import { StackSorter } from './StackSorter';
import { ResumeSimilarityScorer } from './ResumeSimilarityScorer';
import { ScoringEngine } from './ScoringEngine';
import { ApplicationExecutor } from './ApplicationExecutor';
import { ApplicationTracker } from './ApplicationTracker';
import { TinyFishClient, RealTinyFishClient } from './TinyFishClient';
import { MockTinyFishClient } from './MockTinyFishClient';

interface SessionResult {
  sessionId: string;
  status: 'completed' | 'failed';
  summary?: {
    totalScanned: number;
    eliminated: number;
    scored: number;
    applied: number;
    failed: number;
  };
}

export class JobAgentOrchestrator extends EventEmitter {
  private tinyFishClient: TinyFishClient;
  private applicationTracker: ApplicationTracker;

  constructor() {
    super();
    // Use RealTinyFishClient for production
    const apiKey = process.env.TINYFISH_API_KEY;
    if (apiKey && apiKey !== 'your-tinyfish-api-key-here') {
      console.log('✅ Using Real TinyFish API Client with SSE streaming');
      this.tinyFishClient = new RealTinyFishClient(apiKey);

      // Forward TinyFish events
      this.tinyFishClient.on('streamingUrl', (url: string) => {
        console.log('📺 Forwarding streaming URL to frontend:', url);
        this.emit('streamingUrl', url);
      });

      this.tinyFishClient.on('progress', (data: any) => {
        console.log('⏳ TinyFish progress:', data.message);
        // Progress messages are already logged via emitLog
      });
    } else {
      console.warn('⚠️  No valid TinyFish API key found - using MockTinyFishClient');
      console.warn('   Set TINYFISH_API_KEY in .env to use real LinkedIn integration');
      console.warn('   Get your API key from: https://agent.tinyfish.ai/api-keys');
      this.tinyFishClient = new MockTinyFishClient();
    }
    this.applicationTracker = new ApplicationTracker();
  }

  async executeJobSearch(profile: UserProfile, sessionId: string): Promise<SessionResult> {
    try {
      this.emitLog(sessionId, PipelineStage.SearchPlanning, LogLevel.Info, 'Starting job search orchestration');

      // Initialize pipeline stats
      const stats: PipelineStats = {
        totalScanned: 0,
        eliminatedStage1: 0,
        eliminatedByReason: {},
        rankedStage2: 0,
        scoredStage3: 0,
        qualified: 0,
        applied: 0,
        failed: 0
      };

      // Stage 1: Search Strategy Planning
      this.emitLog(sessionId, PipelineStage.SearchPlanning, LogLevel.Info, 'Planning search strategy');
      const searchPlanner = new SearchPlanner();
      const searchStrategy = searchPlanner.planStrategy(profile);

      this.emitLog(sessionId, PipelineStage.SearchPlanning, LogLevel.Success,
        `Strategy planned: ${searchStrategy.keywords.length} keywords, ${searchStrategy.jobBoards.length} job boards`);

      // Stage 2: Intent Analysis (before scraping to get weights)
      this.emitLog(sessionId, PipelineStage.SearchPlanning, LogLevel.Info, 'Analyzing user intent');
      const intentEngine = new IntentEngine();
      const intentAnalysis = intentEngine.analyzeIntent(profile);

      // Emit intent reasoning for frontend display
      this.emit('intentReasoning', {
        sessionId,
        reasoning: intentAnalysis.reasoning,
        userContext: intentAnalysis.userContext,
        scoringWeights: intentAnalysis.scoringWeights
      });

      this.emitLog(sessionId, PipelineStage.SearchPlanning, LogLevel.Success,
        `Intent analyzed: ${intentAnalysis.userContext.experienceLevel} level, ${intentAnalysis.userContext.mobilityConstraints}`);

      // Stage 3: Job Scraping with TinyFish
      this.emitLog(sessionId, PipelineStage.Scraping, LogLevel.Info, 'Scraping job listings from LinkedIn');
      const scrapedJobs = await this.tinyFishClient.searchJobs(searchStrategy);
      stats.totalScanned = scrapedJobs.length;

      this.emitLog(sessionId, PipelineStage.Scraping, LogLevel.Success,
        `Found ${scrapedJobs.length} job listings from ${searchStrategy.jobBoards.join(', ')}`);
      this.emitLog(sessionId, PipelineStage.Scraping, LogLevel.Success,
        `Found ${scrapedJobs.length} job listings`);

      // Stage 4: Hard Filtering
      this.emitLog(sessionId, PipelineStage.HardFilter, LogLevel.Info, 'Applying hard filters');
      const hardFilter = new HardFilter(profile);
      const filterResult = hardFilter.applyFilters(scrapedJobs);

      stats.eliminatedStage1 = filterResult.eliminated.length;
      filterResult.eliminated.forEach(elimination => {
        const reason = elimination.reason;
        stats.eliminatedByReason[reason] = (stats.eliminatedByReason[reason] || 0) + 1;
      });

      this.emitLog(sessionId, PipelineStage.HardFilter, LogLevel.Success,
        `Hard filtering complete: ${filterResult.passed.length} passed, ${filterResult.eliminated.length} eliminated`);

      // Stage 5: Stack Sorting
      this.emitLog(sessionId, PipelineStage.StackSorting, LogLevel.Info, 'Sorting by tech stack relevance');
      const stackSorter = new StackSorter(profile);
      const stackMatches = stackSorter.sortByStackRelevance(filterResult.passed);
      stats.rankedStage2 = stackMatches.length;

      this.emitLog(sessionId, PipelineStage.StackSorting, LogLevel.Success,
        `Stack sorting complete: ${stackMatches.length} jobs ranked`);

      // Stage 6: Resume Similarity Scoring
      this.emitLog(sessionId, PipelineStage.Scoring, LogLevel.Info, 'Computing resume similarities');
      const resumeText = await this.loadResumeText(profile.resumePath);
      const resumeScorer = new ResumeSimilarityScorer(resumeText);

      const resumeSimilarities = new Map();
      for (const stackMatch of stackMatches) {
        const similarity = await resumeScorer.computeSimilarity(stackMatch.job.description);
        resumeSimilarities.set(stackMatch.job.id, similarity);
      }

      // Stage 7: Final Scoring with Custom Weights
      this.emitLog(sessionId, PipelineStage.Scoring, LogLevel.Info, 'Applying weighted scoring');
      const scoringEngine = new ScoringEngine(profile, intentAnalysis.scoringWeights);
      const scoredJobs = scoringEngine.scoreJobs(stackMatches, resumeSimilarities);
      stats.scoredStage3 = scoredJobs.length;

      const qualifiedJobs = scoredJobs.filter(job => job.qualifies);
      stats.qualified = qualifiedJobs.length;

      this.emitLog(sessionId, PipelineStage.Scoring, LogLevel.Success,
        `Scoring complete: ${qualifiedJobs.length} jobs qualify for application (score ≥50)`);

      // Log all scored jobs for debugging
      scoredJobs.forEach(scoredJob => {
        const emoji = scoredJob.qualifies ? '✅' : '❌';
        this.emitLog(sessionId, PipelineStage.Scoring, LogLevel.Info,
          `${emoji} ${scoredJob.job.title} at ${scoredJob.job.company}: ${scoredJob.totalScore}/105 points`);
      });

      // If no jobs qualify, log why
      if (qualifiedJobs.length === 0 && scoredJobs.length > 0) {
        const highestScore = Math.max(...scoredJobs.map(j => j.totalScore));
        this.emitLog(sessionId, PipelineStage.Scoring, LogLevel.Warning,
          `No jobs qualified (highest score: ${highestScore}/105). Consider adjusting filters or expanding search.`);
      }

      // Stage 8: Application Execution
      this.emitLog(sessionId, PipelineStage.Application, LogLevel.Info,
        `Starting applications to ${qualifiedJobs.length} qualified jobs`);

      const applicationExecutor = new ApplicationExecutor(this.tinyFishClient);

      for (const scoredJob of qualifiedJobs) {
        const applicationResult = await applicationExecutor.applyToJob(scoredJob.job, profile);

        // Record application
        const applicationRecord: ApplicationRecord = {
          jobId: scoredJob.job.id,
          jobTitle: scoredJob.job.title,
          company: scoredJob.job.company,
          score: scoredJob.totalScore,
          status: applicationResult.success ? ApplicationStatus.Success : ApplicationStatus.Failed,
          attempts: 1,
          timestamp: applicationResult.timestamp,
          error: applicationResult.error
        };

        this.applicationTracker.recordApplication(applicationRecord);

        if (applicationResult.success) {
          stats.applied++;
          this.emitLog(sessionId, PipelineStage.Application, LogLevel.Success,
            `Applied to ${scoredJob.job.title} at ${scoredJob.job.company} (score: ${scoredJob.totalScore})`);
        } else {
          stats.failed++;
          this.emitLog(sessionId, PipelineStage.Application, LogLevel.Error,
            `Failed to apply to ${scoredJob.job.title}: ${applicationResult.error}`);
        }
      }

      // Emit final pipeline stats
      this.emit('pipelineStats', { sessionId, stats });

      this.emitLog(sessionId, PipelineStage.ReportGeneration, LogLevel.Success,
        `Job search completed: ${stats.applied} applications submitted, ${stats.failed} failed`);

      // Emit completion event
      this.emit('searchComplete', {
        sessionId,
        summary: {
          totalScanned: stats.totalScanned,
          eliminated: stats.eliminatedStage1,
          scored: stats.scoredStage3,
          applied: stats.applied,
          failed: stats.failed
        }
      });

      return {
        sessionId,
        status: 'completed',
        summary: {
          totalScanned: stats.totalScanned,
          eliminated: stats.eliminatedStage1,
          scored: stats.scoredStage3,
          applied: stats.applied,
          failed: stats.failed
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.emitLog(sessionId, PipelineStage.Application, LogLevel.Error,
        `Job search failed: ${errorMessage}`);

      return {
        sessionId,
        status: 'failed'
      };
    }
  }

  private emitLog(sessionId: string, stage: PipelineStage, level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      stage,
      level,
      message,
      metadata
    };

    this.emit('log', { sessionId, ...logEntry });
  }

  private async loadResumeText(resumePath: string): Promise<string> {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      // Read the resume file
      const buffer = await fs.readFile(resumePath);

      // Determine file type and extract text
      const ext = path.extname(resumePath).toLowerCase();

      if (ext === '.pdf') {
        // pdf-parse v2.x exports a default function
        const pdfParseModule = require('pdf-parse');
        const pdfParse = pdfParseModule.default || pdfParseModule;
        const data = await pdfParse(buffer);
        console.log('✅ Successfully extracted text from PDF');
        console.log(`   Extracted ${data.text.length} characters from ${data.numpages} pages`);
        return data.text;
      } else if (ext === '.docx') {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        console.log('✅ Successfully extracted text from DOCX');
        console.log(`   Extracted ${result.value.length} characters`);
        return result.value;
      } else {
        console.warn(`Unsupported resume format: ${ext}, using placeholder text`);
        return this.getPlaceholderResumeText();
      }
    } catch (error) {
      console.error('Error loading resume text:', error);
      console.warn('Falling back to placeholder resume text');
      return this.getPlaceholderResumeText();
    }
  }

  private getPlaceholderResumeText(): string {
    return `
      Experienced software developer with expertise in modern web technologies.
      Strong background in full-stack development and problem-solving.
      Passionate about building scalable applications and learning new technologies.
    `;
  }

  getApplicationTracker(): ApplicationTracker {
    return this.applicationTracker;
  }
}