/**
 * Bug Tracking Integration for Migration System
 *
 * Integrates with bugs.md or external bug tracking to:
 * - Compare current implementation against reported issues
 * - Perform impact analysis for proposed changes
 * - Track migration-related bugs
 */

import { existsSync, readFileSync } from 'node:fs';
import pathModule from 'node:path';
const { resolve } = pathModule;

interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'resolved' | 'closed';
  category: string;
  relatedMigrations?: string[];
}

class BugTrackerIntegration {
  private bugsFilePath: string;

  constructor() {
    this.bugsFilePath = resolve(process.cwd(), 'bugs.md');
  }

  /**
   * Load bugs from bugs.md file
   */
  async loadBugs(): Promise<BugReport[]> {
    if (!existsSync(this.bugsFilePath)) {
      console.log('[Bug Tracker] No bugs.md file found');
      return [];
    }

    try {
      const content = readFileSync(this.bugsFilePath, 'utf8');
      return this.parseBugsFile(content);
    } catch (error) {
      console.error('[Bug Tracker] Failed to load bugs:', error);
      return [];
    }
  }

  /**
   * Parse bugs.md file
   */
  private parseBugsFile(content: string): BugReport[] {
    const bugs: BugReport[] = [];
    const lines = content.split('\n');
    
    let currentBug: Partial<BugReport> | undefined = undefined;
    
    for (const line of lines) {
      // Parse markdown format
      if (line.startsWith('## ')) {
        if (currentBug) {
          bugs.push(currentBug as BugReport);
        }
        currentBug = {
          id: line.replace('## ', '').trim(),
          title: line.replace('## ', '').trim(),
          status: 'open',
          severity: 'medium',
        };
      } else if (currentBug) {
        if (line.startsWith('### Severity:')) {
          const severity = line.replace('### Severity:', '').trim().toLowerCase();
          currentBug.severity = severity as BugReport['severity'];
        } else if (line.startsWith('### Status:')) {
          const status = line.replace('### Status:', '').trim().toLowerCase();
          currentBug.status = status as BugReport['status'];
        } else if (line.startsWith('### Category:')) {
          const category = line.replace('### Category:', '').trim();
          currentBug.category = category;
        }
      }
    }

    if (currentBug) {
      bugs.push(currentBug as BugReport);
    }

    return bugs;
  }

  /**
   * Check for migration-related bugs
   */
  async checkMigrationBugs(): Promise<{
    total: number;
    open: number;
    critical: number;
    related: BugReport[];
  }> {
    const bugs = await this.loadBugs();
    const migrationBugs = bugs.filter(bug => 
      bug.category === 'migration' || 
      bug.title.toLowerCase().includes('migration') ||
      bug.description.toLowerCase().includes('migration')
    );

    return {
      total: migrationBugs.length,
      open: migrationBugs.filter(b => b.status === 'open').length,
      critical: migrationBugs.filter(b => b.severity === 'critical' && b.status === 'open').length,
      related: migrationBugs.filter(b => b.status === 'open'),
    };
  }

  /**
   * Perform impact analysis for migration
   */
  async analyzeMigrationImpact(migrationName: string): Promise<{
    affectedBugs: BugReport[];
    recommendations: string[];
  }> {
    const bugs = await this.loadBugs();
    const openBugs = bugs.filter(b => b.status === 'open');
    
    const affectedBugs = openBugs.filter(bug =>
      bug.relatedMigrations?.includes(migrationName) ||
      bug.description.toLowerCase().includes(migrationName.toLowerCase())
    );

    const recommendations: string[] = [];
    
    if (affectedBugs.length > 0) {
      recommendations.push(`Review ${affectedBugs.length} related open bug(s) before deployment`);
    }

    const criticalBugs = affectedBugs.filter(b => b.severity === 'critical');
    if (criticalBugs.length > 0) {
      recommendations.push(`⚠️ Critical: ${criticalBugs.length} critical bug(s) may be affected`);
    }

    return {
      affectedBugs,
      recommendations,
    };
  }
}

export { BugTrackerIntegration };

