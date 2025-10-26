# Advanced Blog Platform Integration Plan

**Project:** Pythoughts Blog System Enhancement
**Current State:** Phase 1-4 Complete (Tiptap Editor, TOC, Reader Experience)
**Target:** Enterprise-grade JAMstack Blog Platform
**Timeline:** 16-20 weeks

---

## Executive Summary

This plan transforms the existing blog system into an enterprise-grade publishing platform with:
- **JAMstack Architecture** (SSG/ISR/SSR hybrid)
- **Real-time Collaboration** (multi-user editing)
- **Advanced Media Pipeline** (AI optimization & tagging)
- **Enterprise Security** (CSP/SRI compliance)
- **Git-based Versioning** (full history & rollback)
- **AI-powered Moderation** (safety & compliance)

---

## Current Implementation Analysis

### ✅ **What We Have (Phases 1-4)**

```typescript
// Existing Architecture
├── Tiptap Editor (WYSIWYG with JSONContent)
├── Blog Service (save/publish/slug generation)
├── TOC Generator (h2-h4 extraction)
├── Floating TOC (scroll spy)
├── Blog Reader (prose styles, engagement)
├── Basic Media Upload (images via Supabase Storage)
├── Next.js 15 App Router
└── Supabase Backend (PostgreSQL + Storage)
```

**Strengths to Leverage:**
- ✅ tiptap JSONContent (compatible with MDX conversion)
- ✅ Supabase RLS (ready for auth/permissions)
- ✅ Next.js 15 (built-in ISR/SSG support)
- ✅ Component architecture (shadcn/ui)

**Gaps to Address:**
- ❌ No SSG/ISR rendering
- ❌ No real-time collaboration
- ❌ No Git versioning
- ❌ Basic media optimization
- ❌ No AI moderation
- ❌ No CSP/SRI implementation

---

## 📐 Architecture Overview

### **Target Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Edge CDN (Cloudflare/Vercel)              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  SSG Pages │  │ ISR Blogs  │  │ SSR Dash   │            │
│  │  (Static)  │  │ (Revalidate)│ │ (Dynamic)  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼─────────┐
│   Next.js 15   │  │   Supabase  │  │  Collaboration   │
│   App Router   │  │  (Database) │  │   Server (Yjs)   │
│  - SSG Routes  │  │  - Auth     │  │  - WebSockets    │
│  - ISR Routes  │  │  - Storage  │  │  - CRDT Sync     │
│  - SSR Routes  │  │  - RLS      │  │  - Presence      │
└────────────────┘  └─────────────┘  └──────────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼────────┐  ┌──────────────┐  ┌───────▼─────────┐
│   Media CDN    │  │  AI Services │  │  Git Backend    │
│  (Cloudinary)  │  │  - Rekognition│ │  (isomorphic-  │
│  - WebP/AVIF   │  │  - Vision AI │  │   git)         │
│  - Transforms  │  │  - Moderation│  │  - History     │
│  - AI Tagging  │  │  - Alt Text  │  │  - Diff/Merge  │
└────────────────┘  └──────────────┘  └─────────────────┘
```

---

## 🗓️ Implementation Phases

### **Phase 5: JAMstack Rendering (Weeks 1-3)**

**Goal:** Implement hybrid SSG/ISR/SSR rendering strategy

#### 5.1 Next.js Route Architecture

```typescript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  // Generate paths for top 100 blogs at build time
  const { data } = await supabase
    .from('posts')
    .select('slug')
    .eq('post_type', 'blog')
    .eq('status', 'published')
    .order('view_count', { ascending: false })
    .limit(100);

  return data?.map((post) => ({ slug: post.slug })) ?? [];
}

export const revalidate = 3600; // ISR: Revalidate every hour

export default async function BlogPost({ params }: { params: { slug: string } }) {
  // Server Component - fetch at request time
  const post = await getBlogPostBySlug(params.slug);

  return <BlogPostView post={post} />;
}
```

#### 5.2 Rendering Strategy Matrix

| Route | Strategy | Revalidation | Use Case |
|-------|----------|--------------|----------|
| `/` | SSR | N/A | Personalized feed |
| `/blog/[slug]` | ISR | 1 hour | Published blogs |
| `/blogs` | ISR | 5 min | Blog listing |
| `/profile` | SSR | N/A | User dashboard |
| `/explore` | SSG | Build | Static discovery |

#### 5.3 On-Demand Revalidation

```typescript
// app/api/revalidate/route.ts
export async function POST(request: Request) {
  const { slug, secret } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await revalidatePath(`/blog/${slug}`);
    await revalidatePath('/blogs');
    return Response.json({ revalidated: true });
  } catch (err) {
    return Response.json({ revalidated: false }, { status: 500 });
  }
}
```

**Deliverables:**
- ✅ SSG configuration for top blogs
- ✅ ISR with hourly revalidation
- ✅ On-demand revalidation API
- ✅ Edge middleware for routing
- ✅ Performance benchmarks

**Dependencies:** None (uses existing blog service)

---

### **Phase 6: Edge CDN & Performance (Weeks 3-4)**

**Goal:** Deploy to edge network with optimal caching

#### 6.1 Vercel Edge Configuration

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['cloudinary.com', 'supabase.co'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  headers: async () => [
    {
      source: '/blog/:slug',
      headers: [
        { key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate' },
        { key: 'CDN-Cache-Control', value: 'max-age=86400' },
        { key: 'Vary', value: 'Accept-Encoding' },
      ],
    },
  ],
};
```

#### 6.2 CSP & SRI Implementation

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export function middleware(request: NextRequest) {
  const nonce = crypto.randomBytes(16).toString('base64');
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' https://cloudinary.com data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.supabase.co wss://realtime.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}
```

**Deliverables:**
- ✅ Edge function deployment
- ✅ CSP nonce injection
- ✅ SRI hash generation
- ✅ Cache headers optimization
- ✅ TTFB < 100ms target

**Dependencies:** Phase 5 (rendering strategy)

---

### **Phase 7: Real-Time Collaboration (Weeks 5-8)**

**Goal:** Multi-user co-editing with Yjs + WebSockets

#### 7.1 Yjs Backend Server

```typescript
// collaboration-server/src/index.ts
import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { Logger } from '@hocuspocus/extension-logger';
import { supabase } from './supabase';

const server = Server.configure({
  port: 3001,
  extensions: [
    new Logger(),
    new Database({
      fetch: async ({ documentName }) => {
        const { data } = await supabase
          .from('blog_drafts')
          .select('content_json')
          .eq('id', documentName)
          .single();
        return data?.content_json;
      },
      store: async ({ documentName, state }) => {
        await supabase
          .from('blog_drafts')
          .upsert({
            id: documentName,
            content_json: state,
            updated_at: new Date().toISOString(),
          });
      },
    }),
  ],
  async onAuthenticate({ token }) {
    // Verify Supabase JWT
    const { data, error } = await supabase.auth.getUser(token);
    if (error) throw new Error('Unauthorized');
    return { user: data.user };
  },
});

server.listen();
```

#### 7.2 Tiptap Collaboration Extension

```typescript
// components/blog/editor/CollaborativeEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

export function CollaborativeEditor({ postId, user }: Props) {
  const doc = new Y.Doc();

  const provider = new HocuspocusProvider({
    url: 'wss://collab.yourdomain.com',
    name: postId,
    document: doc,
    token: user.accessToken,
  });

  const editor = useEditor({
    extensions: [
      ...editorExtensions,
      Collaboration.configure({
        document: doc,
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: user.username,
          color: generateUserColor(user.id),
        },
      }),
    ],
  });

  return (
    <div className="relative">
      {/* Presence indicators */}
      <PresenceBar provider={provider} />

      {/* Collaborative editor */}
      <EditorContent editor={editor} />

      {/* Conflict resolution UI */}
      <ConflictResolver provider={provider} />
    </div>
  );
}
```

#### 7.3 Presence & Awareness

```typescript
// components/blog/editor/PresenceBar.tsx
export function PresenceBar({ provider }: { provider: HocuspocusProvider }) {
  const [users, setUsers] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    const awareness = provider.awareness;

    const updateUsers = () => {
      setUsers(new Map(awareness.getStates()));
    };

    awareness.on('change', updateUsers);
    updateUsers();

    return () => awareness.off('change', updateUsers);
  }, [provider]);

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-900 rounded-lg">
      {Array.from(users.entries()).map(([clientId, state]) => (
        <Avatar
          key={clientId}
          user={state.user}
          className="ring-2"
          style={{ borderColor: state.user.color }}
        />
      ))}
      <span className="text-sm text-gray-400">
        {users.size} {users.size === 1 ? 'editor' : 'editors'} online
      </span>
    </div>
  );
}
```

**Deliverables:**
- ✅ Hocuspocus server deployment
- ✅ Yjs document sync
- ✅ Presence indicators
- ✅ Cursor tracking
- ✅ Conflict-free editing
- ✅ Auto-save with CRDT

**Dependencies:** Phase 4 (existing editor)

---

### **Phase 8: Git-Based Versioning (Weeks 9-11)**

**Goal:** Browser-based Git workflow with full history

#### 8.1 Isomorphic Git Integration

```typescript
// lib/git/repository.ts
import git from 'isomorphic-git';
import { LightningFS } from '@isomorphic-git/lightning-fs';
import { supabase } from '../supabase';

export class GitRepository {
  private fs: LightningFS;
  private dir = '/blog-repo';

  constructor() {
    this.fs = new LightningFS('blog-fs');
  }

  async init() {
    await git.init({ fs: this.fs, dir: this.dir });
  }

  async commit(postId: string, content: any, message: string, author: any) {
    const filepath = `posts/${postId}.json`;

    // Write file
    await this.fs.promises.writeFile(
      `${this.dir}/${filepath}`,
      JSON.stringify(content, null, 2)
    );

    // Stage file
    await git.add({ fs: this.fs, dir: this.dir, filepath });

    // Commit
    const sha = await git.commit({
      fs: this.fs,
      dir: this.dir,
      message,
      author: {
        name: author.username,
        email: author.email,
      },
    });

    // Sync to Supabase Storage
    await this.syncToCloud(postId, sha);

    return sha;
  }

  async getHistory(postId: string, limit = 20) {
    const commits = await git.log({
      fs: this.fs,
      dir: this.dir,
      ref: 'HEAD',
      depth: limit,
    });

    return commits.map((commit) => ({
      sha: commit.oid,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: new Date(commit.commit.author.timestamp * 1000),
    }));
  }

  async rollback(postId: string, sha: string) {
    // Checkout specific commit
    await git.checkout({
      fs: this.fs,
      dir: this.dir,
      ref: sha,
    });

    // Read file content
    const content = await this.fs.promises.readFile(
      `${this.dir}/posts/${postId}.json`,
      { encoding: 'utf8' }
    );

    return JSON.parse(content);
  }

  async diff(postId: string, oldSha: string, newSha: string) {
    // Get file at both commits
    const oldContent = await this.getFileAtCommit(postId, oldSha);
    const newContent = await this.getFileAtCommit(postId, newSha);

    // Use diff library
    return generateDiff(oldContent, newContent);
  }

  private async syncToCloud(postId: string, sha: string) {
    // Upload entire .git folder to Supabase Storage for persistence
    const gitData = await this.fs.promises.readdir(`${this.dir}/.git`);

    await supabase.storage
      .from('git-repositories')
      .upload(`${postId}/${sha}/.git.tar.gz`, compressGitData(gitData));
  }
}
```

#### 8.2 Version History UI

```typescript
// components/blog/editor/VersionHistory.tsx
export function VersionHistory({ postId }: { postId: string }) {
  const [commits, setCommits] = useState([]);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const repo = useGitRepository();

  useEffect(() => {
    loadHistory();
  }, [postId]);

  const loadHistory = async () => {
    const history = await repo.getHistory(postId);
    setCommits(history);
  };

  const handleRestore = async (sha: string) => {
    const content = await repo.rollback(postId, sha);
    // Update editor with rolled-back content
    editor.commands.setContent(content);
  };

  const handleViewDiff = async (sha: string) => {
    const diff = await repo.diff(postId, commits[0].sha, sha);
    setSelectedDiff(diff);
  };

  return (
    <Sheet>
      <SheetTrigger>
        <Button variant="outline">
          <History className="w-4 h-4 mr-2" />
          Version History
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px]">
        <ScrollArea className="h-full">
          {commits.map((commit) => (
            <div key={commit.sha} className="p-4 border-b">
              <div className="flex justify-between">
                <div>
                  <p className="font-mono text-sm">{commit.sha.slice(0, 7)}</p>
                  <p className="text-sm">{commit.message}</p>
                  <p className="text-xs text-gray-500">
                    {commit.author} • {formatRelative(commit.date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleViewDiff(commit.sha)}>
                    Diff
                  </Button>
                  <Button size="sm" onClick={() => handleRestore(commit.sha)}>
                    Restore
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

**Deliverables:**
- ✅ Isomorphic-git integration
- ✅ Commit workflow
- ✅ History viewer
- ✅ Diff visualization
- ✅ Rollback functionality
- ✅ Cloud sync to Supabase

**Dependencies:** Phase 4 (editor), Phase 7 (collaboration)

---

### **Phase 9: Advanced Media Pipeline (Weeks 12-14)**

**Goal:** AI-powered media optimization & management

#### 9.1 Cloudinary Integration

```typescript
// lib/media/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(file: File, userId: string) {
  // Generate pre-signed upload URL
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: `users/${userId}` },
    process.env.CLOUDINARY_API_SECRET!
  );

  // Client-side direct upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', `users/${userId}`);
  formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  const data = await response.json();

  // AI tagging and analysis
  const analysis = await analyzeImage(data.public_id);

  return {
    public_id: data.public_id,
    url: data.secure_url,
    width: data.width,
    height: data.height,
    format: data.format,
    tags: analysis.tags,
    alt_text: analysis.alt_text,
  };
}

async function analyzeImage(publicId: string) {
  // Use Cloudinary AI addon
  const result = await cloudinary.api.resource(publicId, {
    categorization: 'google_tagging',
    detection: 'captioning',
  });

  return {
    tags: result.info?.categorization?.google_tagging?.data || [],
    alt_text: result.info?.detection?.captioning?.data?.caption || '',
  };
}
```

#### 9.2 Responsive Image Component

```typescript
// components/media/ResponsiveImage.tsx
import Image from 'next/image';

interface ResponsiveImageProps {
  publicId: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}

export function ResponsiveImage({ publicId, alt, width, height, priority }: ResponsiveImageProps) {
  const cloudinaryLoader = ({ src, width, quality }: any) => {
    const params = [
      'f_auto',
      'q_auto',
      `w_${width}`,
      quality ? `q_${quality}` : 'q_auto',
    ];
    return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${params.join(',')}/${src}`;
  };

  return (
    <Image
      loader={cloudinaryLoader}
      src={publicId}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="rounded-lg"
    />
  );
}
```

#### 9.3 AI Alt Text Generation

```typescript
// lib/media/alt-text.ts
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

export async function generateAltText(imageUrl: string): Promise<string> {
  const prompt = {
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: 'Generate a concise, accessible alt text description for this image (max 125 characters). Focus on key visual elements and context.',
            },
          ],
        },
      ],
    }),
  };

  const command = new InvokeModelCommand(prompt);
  const response = await bedrock.send(command);
  const data = JSON.parse(new TextDecoder().decode(response.body));

  return data.content[0].text;
}
```

**Deliverables:**
- ✅ Cloudinary integration
- ✅ WebP/AVIF optimization
- ✅ Responsive image component
- ✅ AI tagging (Google Vision)
- ✅ AI alt text generation
- ✅ Pre-signed upload URLs
- ✅ CDN caching

**Dependencies:** None

---

### **Phase 10: AI Moderation & Safety (Weeks 15-16)**

**Goal:** Multi-layer content moderation system

#### 10.1 AWS Rekognition Integration

```typescript
// lib/moderation/image-scanner.ts
import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';

const rekognition = new RekognitionClient({ region: 'us-east-1' });

export async function scanImage(imageUrl: string) {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();

  const command = new DetectModerationLabelsCommand({
    Image: { Bytes: new Uint8Array(buffer) },
    MinConfidence: 75,
  });

  const result = await rekognition.send(command);

  const flags = result.ModerationLabels?.filter((label) =>
    label.Confidence! > 85
  ) || [];

  return {
    safe: flags.length === 0,
    flags: flags.map((label) => ({
      category: label.Name,
      confidence: label.Confidence,
      parentCategory: label.ParentName,
    })),
  };
}
```

#### 10.2 Text Content Moderation

```typescript
// lib/moderation/text-scanner.ts
import { ComprehendClient, DetectToxicContentCommand } from '@aws-sdk/client-comprehend';

const comprehend = new ComprehendClient({ region: 'us-east-1' });

export async function scanText(content: string) {
  const command = new DetectToxicContentCommand({
    TextSegments: [{ Text: content }],
    LanguageCode: 'en',
  });

  const result = await comprehend.send(command);

  const toxicity = result.ResultList?.[0];
  const toxic = toxicity?.Toxicity! > 0.7;

  return {
    safe: !toxic,
    score: toxicity?.Toxicity || 0,
    categories: Object.entries(toxicity?.Labels || {})
      .filter(([_, score]) => score > 0.5)
      .map(([category, score]) => ({ category, score })),
  };
}
```

#### 10.3 Moderation Queue

```typescript
// components/moderation/ModerationQueue.tsx
export function ModerationQueue() {
  const { data: flaggedContent } = useQuery({
    queryKey: ['moderation-queue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('moderation_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      return data;
    },
  });

  const handleApprove = async (itemId: string) => {
    await supabase
      .from('moderation_queue')
      .update({ status: 'approved', reviewed_at: new Date() })
      .eq('id', itemId);
  };

  const handleReject = async (itemId: string, reason: string) => {
    await supabase
      .from('moderation_queue')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date(),
      })
      .eq('id', itemId);
  };

  return (
    <div className="space-y-4">
      {flaggedContent?.map((item) => (
        <ModerationCard
          key={item.id}
          item={item}
          onApprove={() => handleApprove(item.id)}
          onReject={(reason) => handleReject(item.id, reason)}
        />
      ))}
    </div>
  );
}
```

**Deliverables:**
- ✅ AWS Rekognition integration
- ✅ Text toxicity detection
- ✅ Automated flagging system
- ✅ Human review queue
- ✅ Trust scoring
- ✅ Appeal process
- ✅ Audit logging

**Dependencies:** None

---

## 📊 Timeline & Resource Allocation

| Phase | Duration | Complexity | Team Size | Dependencies |
|-------|----------|------------|-----------|--------------|
| 5: JAMstack | 3 weeks | Medium | 2 devs | None |
| 6: CDN/Security | 1 week | Low | 1 dev | Phase 5 |
| 7: Collaboration | 4 weeks | High | 2-3 devs | Phase 4 |
| 8: Git Versioning | 3 weeks | High | 2 devs | Phase 4, 7 |
| 9: Media Pipeline | 3 weeks | Medium | 2 devs | None |
| 10: Moderation | 2 weeks | Medium | 1-2 devs | None |
| **Total** | **16 weeks** | | **~3 devs** | |

---

## 🔧 Technical Stack

### **Core Technologies**

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 15 | SSG/ISR/SSR rendering |
| **Backend** | Supabase | Database, Auth, Storage |
| **Collaboration** | Yjs + Hocuspocus | Real-time sync |
| **Git** | isomorphic-git | Version control |
| **Media** | Cloudinary | Image optimization |
| **AI Vision** | AWS Rekognition | Image moderation |
| **AI Text** | AWS Comprehend | Text moderation |
| **AI Alt** | Anthropic Claude | Alt text generation |
| **CDN** | Vercel Edge | Global delivery |

### **Key Libraries**

```json
{
  "dependencies": {
    "@tiptap/extension-collaboration": "^2.10.5",
    "@tiptap/extension-collaboration-cursor": "^2.10.5",
    "@hocuspocus/provider": "^2.13.5",
    "@hocuspocus/server": "^2.13.5",
    "yjs": "^13.6.18",
    "isomorphic-git": "^1.25.10",
    "@isomorphic-git/lightning-fs": "^4.6.0",
    "cloudinary": "^2.5.0",
    "@aws-sdk/client-rekognition": "^3.645.0",
    "@aws-sdk/client-comprehend": "^3.645.0",
    "@aws-sdk/client-bedrock-runtime": "^3.645.0"
  }
}
```

---

## 🚀 Deployment Architecture

### **Infrastructure**

```yaml
# vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/collab/:path*",
      "destination": "https://collab-server.yourdomain.com/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### **Environment Variables**

```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

HOCUSPOCUS_SERVER_URL=wss://collab.yourdomain.com

REVALIDATION_SECRET=
```

---

## 📈 Success Metrics

### **Performance Targets**

| Metric | Target | Current | Delta |
|--------|--------|---------|-------|
| TTFB | < 100ms | ~500ms | 5x improvement |
| FCP | < 1.0s | ~2.0s | 2x improvement |
| LCP | < 2.5s | ~4.0s | 1.6x improvement |
| CLS | < 0.1 | 0.15 | 33% improvement |
| TTI | < 3.5s | ~5.0s | 1.4x improvement |

### **Feature Adoption**

- **Collaboration:** 30% of drafts multi-user
- **Version Control:** 80% adoption for rollbacks
- **AI Alt Text:** 95% auto-generated
- **Moderation:** 85% auto-approved

---

## 🔄 Migration Strategy

### **Phase-by-Phase Migration**

1. **Phase 5:** SSG/ISR (No breaking changes)
2. **Phase 6:** CDN (Transparent to users)
3. **Phase 7:** Collaboration (Opt-in for drafts)
4. **Phase 8:** Git (Auto-enabled, backward compatible)
5. **Phase 9:** Media (Migrate existing to Cloudinary)
6. **Phase 10:** Moderation (Shadow mode → Full enforcement)

### **Data Migration**

```sql
-- Migrate existing content_html to new format
UPDATE posts
SET content_json = convert_html_to_json(content_html)
WHERE content_json IS NULL;

-- Create git history for existing posts
INSERT INTO git_commits (post_id, sha, message, author_id, created_at)
SELECT id, gen_random_uuid(), 'Initial commit', author_id, created_at
FROM posts
WHERE id NOT IN (SELECT DISTINCT post_id FROM git_commits);
```

---

## 🛡️ Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Collaboration conflicts** | Medium | High | CRDT guarantees, conflict UI |
| **Git storage limits** | Low | Medium | Compression, lazy loading |
| **AI false positives** | Medium | High | Human review queue |
| **CDN costs** | Low | Medium | Cloudinary free tier, caching |
| **WebSocket scaling** | High | High | Horizontal scaling, Redis pub/sub |

---

## 📝 Next Steps

### **Immediate Actions (Week 1)**

1. ✅ Set up JAMstack rendering (Phase 5)
2. ✅ Configure Vercel Edge deployment
3. ✅ Set up Cloudinary account
4. ✅ Provision AWS services (Rekognition, Comprehend)
5. ✅ Deploy Hocuspocus collaboration server

### **Sprint 1 Deliverables (Weeks 1-3)**

- [ ] SSG/ISR implementation
- [ ] Edge CDN configuration
- [ ] CSP/SRI headers
- [ ] Performance benchmarks
- [ ] Load testing results

---

## 📚 Documentation Requirements

1. **API Documentation:** OpenAPI specs for all endpoints
2. **Collaboration Guide:** Multi-user editing tutorial
3. **Version Control:** Git workflow for writers
4. **Moderation Policy:** Content guidelines & appeal process
5. **Performance Playbook:** Optimization best practices

---

**Last Updated:** 2025-10-26
**Version:** 1.0
**Status:** Ready for Implementation

---

## Appendix A: API Contracts

### **Collaboration API**

```typescript
// WebSocket Protocol
interface CollaborationMessage {
  type: 'sync' | 'update' | 'awareness' | 'save';
  payload: {
    documentName: string;
    clientId: number;
    changes?: Uint8Array;
    state?: any;
  };
}
```

### **Moderation API**

```typescript
// POST /api/moderation/scan
interface ScanRequest {
  contentType: 'text' | 'image';
  content: string; // Text or image URL
}

interface ScanResponse {
  safe: boolean;
  flags: ModerationFlag[];
  actions: 'approve' | 'review' | 'reject';
}
```

---

## Appendix B: Database Schema

```sql
-- Git commits table
CREATE TABLE git_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),
  sha TEXT NOT NULL,
  message TEXT,
  author_id UUID REFERENCES profiles(id),
  parent_sha TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderation queue
CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  flags JSONB,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaboration sessions
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),
  user_id UUID REFERENCES profiles(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_edits INT DEFAULT 0
);
```

---

**End of Integration Plan**
