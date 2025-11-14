/**
 * Git Helper Utilities
 * Functions for interacting with Git to get change information
 */

import { execSync } from 'child_process';

export interface GitStats {
  file: string;
  additions: number;
  deletions: number;
  changes: number;
}

/**
 * Get the current branch name
 */
export function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
    }).trim();
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Get the base branch (main, master, or develop)
 */
export function getBaseBranch(): string {
  try {
    // Check if main exists
    execSync('git show-ref --verify --quiet refs/heads/main');
    return 'main';
  } catch {
    try {
      // Check if master exists
      execSync('git show-ref --verify --quiet refs/heads/master');
      return 'master';
    } catch {
      try {
        // Check if develop exists
        execSync('git show-ref --verify --quiet refs/heads/develop');
        return 'develop';
      } catch {
        // Default to main
        return 'main';
      }
    }
  }
}

/**
 * Get list of changed files compared to base branch
 */
export function getChangedFiles(baseBranch?: string): string[] {
  try {
    const base = baseBranch || getBaseBranch();
    const currentBranch = getCurrentBranch();

    // If we're on the base branch, get uncommitted changes
    if (currentBranch === base) {
      const output = execSync('git diff --name-only HEAD', {
        encoding: 'utf-8',
      }).trim();
      return output ? output.split('\n') : [];
    }

    // Get files changed compared to base branch
    const output = execSync(`git diff --name-only ${base}...HEAD`, {
      encoding: 'utf-8',
    }).trim();

    return output ? output.split('\n') : [];
  } catch (error) {
    console.warn('Warning: Could not get changed files from git');
    return [];
  }
}

/**
 * Get staged files (for pre-commit hook)
 */
export function getStagedFiles(): string[] {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
    }).trim();

    return output ? output.split('\n') : [];
  } catch (error) {
    return [];
  }
}

/**
 * Get file statistics (additions/deletions)
 */
export function getFileStats(baseBranch?: string): GitStats[] {
  try {
    const base = baseBranch || getBaseBranch();
    const currentBranch = getCurrentBranch();

    const diffBase = currentBranch === base ? 'HEAD' : `${base}...HEAD`;

    const output = execSync(`git diff --numstat ${diffBase}`, {
      encoding: 'utf-8',
    }).trim();

    if (!output) return [];

    return output.split('\n').map((line) => {
      const [additions, deletions, file] = line.split(/\s+/);
      return {
        file,
        additions: parseInt(additions, 10) || 0,
        deletions: parseInt(deletions, 10) || 0,
        changes: (parseInt(additions, 10) || 0) + (parseInt(deletions, 10) || 0),
      };
    });
  } catch (error) {
    return [];
  }
}

/**
 * Get current commit SHA
 */
export function getCurrentCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Get commit author
 */
export function getCommitAuthor(): string {
  try {
    return execSync('git config user.name', { encoding: 'utf-8' }).trim();
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Get commit author email
 */
export function getCommitAuthorEmail(): string {
  try {
    return execSync('git config user.email', { encoding: 'utf-8' }).trim();
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Get remote repository URL
 */
export function getRemoteUrl(): string {
  try {
    return execSync('git config --get remote.origin.url', {
      encoding: 'utf-8',
    }).trim();
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Check if we're in a Git repository
 */
export function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get git root directory
 */
export function getGitRoot(): string {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
    }).trim();
  } catch (error) {
    return process.cwd();
  }
}

/**
 * Check if there are uncommitted changes
 */
export function hasUncommittedChanges(): boolean {
  try {
    const output = execSync('git status --porcelain', {
      encoding: 'utf-8',
    }).trim();
    return output.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get list of commits since base branch
 */
export function getCommitsSince(baseBranch?: string): string[] {
  try {
    const base = baseBranch || getBaseBranch();
    const output = execSync(`git log ${base}..HEAD --oneline`, {
      encoding: 'utf-8',
    }).trim();

    return output ? output.split('\n') : [];
  } catch (error) {
    return [];
  }
}
