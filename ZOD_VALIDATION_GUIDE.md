# Zod Validation Guide

## Table of Contents

- [Overview](#overview)
- [Why Zod?](#why-zod)
- [Core Concepts](#core-concepts)
- [Directory Structure](#directory-structure)
- [Common Validation Schemas](#common-validation-schemas)
- [Creating New Schemas](#creating-new-schemas)
- [Using Validation in Server Actions](#using-validation-in-server-actions)
- [Error Handling](#error-handling)
- [Testing Validation Logic](#testing-validation-logic)
- [Best Practices](#best-practices)
- [Advanced Patterns](#advanced-patterns)
- [TypeScript Integration](#typescript-integration)
- [Examples](#examples)

---

## Overview

This guide explains how to use Zod for input validation in the Pythoughts application. Zod provides type-safe runtime validation that integrates seamlessly with TypeScript, ensuring data integrity across all Server Actions.

**Key Benefits:**
- Type-safe validation with TypeScript inference
- User-friendly error messages
- Runtime safety for all inputs
- Consistent validation patterns
- Reduced boilerplate code

---

## Why Zod?

Zod was chosen for Pythoughts because it:

1. **Type Safety**: Automatically infers TypeScript types from validation schemas
2. **Runtime Validation**: Catches invalid data before it reaches your business logic
3. **Developer Experience**: Intuitive API with excellent error messages
4. **Composability**: Build complex validations from simple schemas
5. **Zero Dependencies**: Lightweight and performant
6. **Server Actions**: Perfect for Next.js Server Actions validation

---

## Core Concepts

### Schema Definition

A schema defines the shape and constraints of data:

```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
  username: z.string().min(3).max(30),
});
```

### Type Inference

Extract TypeScript types from schemas:

```typescript
type User = z.infer<typeof userSchema>;
// Result: { email: string; age: number; username: string }
```

### Validation

Validate data against a schema:

```typescript
const result = userSchema.safeParse(userData);

if (result.success) {
  console.log(result.data); // Validated data
} else {
  console.log(result.error); // Validation errors
}
```

---

## Directory Structure

```
src/
├── lib/
│   └── validation.ts          # Common validation utilities
├── schemas/
│   ├── auth.ts                # Authentication schemas
│   ├── posts.ts               # Post validation schemas
│   ├── categories.ts          # Category schemas
│   ├── tags.ts                # Tag schemas
│   ├── comments.ts            # Comment schemas
│   ├── profiles.ts            # Profile schemas
│   └── __tests__/             # Schema tests
│       ├── validation.test.ts
│       ├── posts.test.ts
│       └── categories.test.ts
└── actions/
    ├── posts-validated.ts     # Server Actions with validation
    ├── categories-validated.ts
    └── tags-validated.ts
```

---

## Common Validation Schemas

### Email Validation

```typescript
import { emailSchema } from '@/lib/validation';

// Usage
const result = emailSchema.safeParse('user@example.com');
```

**Features:**
- Valid email format
- Lowercase conversion
- Whitespace trimming
- Length limits (3-254 characters)

### Password Validation

```typescript
import { passwordSchema } from '@/lib/validation';

// Usage
const result = passwordSchema.safeParse('MyPassword123');
```

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Maximum 128 characters

### URL Validation

```typescript
import { urlSchema, optionalUrlSchema } from '@/lib/validation';

// Required URL
const url = urlSchema.safeParse('https://example.com');

// Optional URL
const optUrl = optionalUrlSchema.safeParse('');
```

### UUID Validation

```typescript
import { uuidSchema } from '@/lib/validation';

// Usage
const result = uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
```

### Slug Validation

```typescript
import { slugSchema } from '@/lib/validation';

// Valid: lowercase, numbers, hyphens only
const result = slugSchema.safeParse('my-blog-post-2025');
```

### Username Validation

```typescript
import { usernameSchema } from '@/lib/validation';

// 3-30 characters, alphanumeric + underscores
const result = usernameSchema.safeParse('john_doe_123');
```

---

## Creating New Schemas

### Step 1: Define the Schema

Create a new file in `src/schemas/` for your domain:

```typescript
// src/schemas/reactions.ts
import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';

export const createReactionSchema = z.object({
  post_id: uuidSchema,
  user_id: uuidSchema,
  reaction_type: z.enum(['like', 'clap', 'bookmark']),
});

export type CreateReactionInput = z.infer<typeof createReactionSchema>;
```

### Step 2: Add Custom Validations

Use `.refine()` for complex validations:

```typescript
export const dateRangeSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
}).refine(
  (data) => data.end >= data.start,
  {
    message: 'End date must be after start date',
    path: ['end'],
  }
);
```

### Step 3: Create Composite Schemas

Combine schemas for reusability:

```typescript
const basePostSchema = z.object({
  title: postTitleSchema,
  content: z.string(),
});

export const createPostSchema = basePostSchema.extend({
  author_id: uuidSchema,
  tags: z.array(z.string()).max(10),
});

export const updatePostSchema = basePostSchema.partial().extend({
  id: uuidSchema,
});
```

---

## Using Validation in Server Actions

### Basic Pattern

```typescript
'use server';

import { validateSchema } from '@/lib/validation';
import { createPostSchema } from '@/schemas/posts';

export async function createPost(input: unknown) {
  // 1. Validate input
  const validation = validateSchema(createPostSchema, input);

  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      errors: validation.errors,
    };
  }

  // 2. Use validated data
  const validatedData = validation.data;

  // 3. Proceed with business logic
  try {
    const post = await db.posts.create(validatedData);
    return { success: true, data: post };
  } catch (error) {
    return { success: false, error: 'Failed to create post' };
  }
}
```

### With Authentication

```typescript
export async function updateProfile(userId: string, input: unknown) {
  // Validate user ID
  const userValidation = validateSchema(uuidSchema, userId);
  if (!userValidation.success) {
    return { success: false, error: 'Invalid user ID' };
  }

  // Validate profile data
  const profileValidation = validateSchema(updateProfileSchema, input);
  if (!profileValidation.success) {
    return {
      success: false,
      error: 'Invalid profile data',
      errors: profileValidation.errors,
    };
  }

  // Proceed with update
  const validatedProfile = profileValidation.data;
  // ... business logic
}
```

### With FormData

```typescript
import { formDataToObject } from '@/lib/validation';

export async function submitForm(formData: FormData) {
  // Convert FormData to object
  const data = formDataToObject(formData);

  // Validate
  const validation = validateSchema(formSchema, data);

  if (!validation.success) {
    return { success: false, errors: validation.errors };
  }

  // Process validated data
  // ...
}
```

---

## Error Handling

### Field-Level Errors

```typescript
const validation = validateSchema(schema, data);

if (!validation.success) {
  // validation.errors is a Record<string, string[]>
  // Example: { email: ['Invalid email'], age: ['Must be at least 18'] }

  return {
    success: false,
    errors: validation.errors,
  };
}
```

### User-Friendly Error Messages

```typescript
const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

### Custom Error Formatting

```typescript
const validation = validateSchema(schema, data);

if (!validation.success) {
  const errorMessage = Object.entries(validation.errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('; ');

  logger.warn('Validation failed', { errors: validation.errors });

  return {
    success: false,
    error: errorMessage,
    errors: validation.errors,
  };
}
```

---

## Testing Validation Logic

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createPostSchema } from '@/schemas/posts';

describe('createPostSchema', () => {
  it('should validate valid post data', () => {
    const validData = {
      title: 'Test Post',
      content_html: '<p>Content</p>',
      tags: ['typescript'],
    };

    const result = createPostSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject empty title', () => {
    const invalidData = {
      title: '',
      content_html: '<p>Content</p>',
    };

    const result = createPostSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('createPost Server Action', () => {
  it('should reject invalid input', async () => {
    const result = await createPost({ title: '' });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('title');
  });

  it('should create post with valid input', async () => {
    const result = await createPost({
      title: 'Test',
      content_html: '<p>Content</p>',
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
  });
});
```

---

## Best Practices

### 1. Always Validate Unknown Input

```typescript
// Good
export async function createPost(input: unknown) {
  const validation = validateSchema(createPostSchema, input);
  // ...
}

// Bad - trusts input type
export async function createPost(input: CreatePostInput) {
  // No runtime validation!
}
```

### 2. Use Type Inference

```typescript
// Good
export type CreatePostInput = z.infer<typeof createPostSchema>;

// Bad - duplicating types
export type CreatePostInput = {
  title: string;
  content: string;
  // ... can get out of sync with schema
};
```

### 3. Provide Helpful Error Messages

```typescript
// Good
const schema = z.string().min(8, 'Password must be at least 8 characters');

// Bad
const schema = z.string().min(8); // Generic error message
```

### 4. Use Default Values Wisely

```typescript
const schema = z.object({
  limit: z.number().min(1).max(100).default(10),
  page: z.number().min(1).default(1),
});

// Default values automatically applied
const result = schema.parse({}); // { limit: 10, page: 1 }
```

### 5. Compose Reusable Schemas

```typescript
// Reusable base schemas
const timestampSchema = z.object({
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

// Compose into specific schemas
const postSchema = z.object({
  title: z.string(),
  content: z.string(),
}).merge(timestampSchema);
```

### 6. Handle Optional Fields Properly

```typescript
// Optional with undefined
const schema = z.object({
  bio: z.string().optional(), // string | undefined
});

// Optional with empty string
const schema = z.object({
  bio: z.string().optional().or(z.literal('')), // string | undefined | ""
});

// Nullable
const schema = z.object({
  avatar_url: z.string().url().nullable(), // string | null
});
```

---

## Advanced Patterns

### Discriminated Unions

```typescript
const eventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('post_created'),
    post_id: uuidSchema,
  }),
  z.object({
    type: z.literal('post_updated'),
    post_id: uuidSchema,
    changes: z.record(z.unknown()),
  }),
]);

type Event = z.infer<typeof eventSchema>;
// TypeScript knows the shape based on 'type'
```

### Transformations

```typescript
const schema = z.object({
  email: z.string().email().transform(s => s.toLowerCase()),
  tags: z.string().transform(s => s.split(',').map(t => t.trim())),
});

const result = schema.parse({
  email: 'USER@EXAMPLE.COM',
  tags: 'typescript, testing, zod',
});
// Result: { email: 'user@example.com', tags: ['typescript', 'testing', 'zod'] }
```

### Async Validation

```typescript
const schema = z.object({
  username: z.string().refine(
    async (username) => {
      const exists = await checkUsernameExists(username);
      return !exists;
    },
    { message: 'Username already taken' }
  ),
});

const result = await schema.parseAsync(data);
```

### Conditional Validation

```typescript
const schema = z.object({
  role: z.enum(['user', 'admin']),
  permissions: z.array(z.string()).optional(),
}).refine(
  (data) => data.role === 'admin' ? data.permissions !== undefined : true,
  {
    message: 'Admins must have permissions defined',
    path: ['permissions'],
  }
);
```

---

## TypeScript Integration

### Type-Safe Server Actions

```typescript
import type { CreatePostInput } from '@/schemas/posts';

// TypeScript knows the exact shape
function processPost(post: CreatePostInput) {
  console.log(post.title);    // string
  console.log(post.tags);     // string[]
  console.log(post.status);   // 'draft' | 'published' | 'scheduled'
}
```

### Branded Types

For enhanced type safety:

```typescript
const PostId = z.string().uuid().brand('PostId');
const UserId = z.string().uuid().brand('UserId');

type PostId = z.infer<typeof PostId>;
type UserId = z.infer<typeof UserId>;

// TypeScript prevents mixing these up
function getPost(postId: PostId, userId: UserId) {
  // ...
}
```

### Type Guards

```typescript
function isValidEmail(email: unknown): email is string {
  return emailSchema.safeParse(email).success;
}

if (isValidEmail(input)) {
  // TypeScript knows input is string
  sendEmail(input);
}
```

---

## Examples

### Complete Server Action Example

```typescript
'use server';

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { validateSchema } from '@/lib/validation';
import { createCategorySchema, type CreateCategoryInput } from '@/schemas/categories';

export async function createCategory(
  userId: string,
  input: unknown
): Promise<{
  success: boolean;
  error?: string;
  errors?: Record<string, string[]>;
  category?: Category;
}> {
  // 1. Validate input
  const validation = validateSchema(createCategorySchema, input);

  if (!validation.success) {
    logger.warn('Invalid category input', { errors: validation.errors });
    return {
      success: false,
      error: 'Invalid input',
      errors: validation.errors,
    };
  }

  const validatedCategory = validation.data;

  // 2. Check authorization
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (!profile?.is_admin) {
    logger.warn('Unauthorized category creation', { userId });
    return {
      success: false,
      error: 'Unauthorized: Admin access required',
    };
  }

  // 3. Execute database operation
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert(validatedCategory)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Category already exists' };
      }
      throw error;
    }

    logger.info('Category created', { categoryId: data.id, userId });
    return { success: true, category: data };

  } catch (error) {
    logger.error('Failed to create category', error as Error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
```

### Client-Side Usage

```typescript
'use client';

import { createCategory } from '@/actions/categories-validated';

export function CategoryForm() {
  const handleSubmit = async (formData: FormData) => {
    const result = await createCategory(userId, {
      name: formData.get('name'),
      slug: formData.get('slug'),
      color: formData.get('color'),
    });

    if (!result.success) {
      // Display field-level errors
      if (result.errors) {
        Object.entries(result.errors).forEach(([field, messages]) => {
          console.error(`${field}: ${messages.join(', ')}`);
        });
      } else {
        console.error(result.error);
      }
      return;
    }

    console.log('Category created:', result.category);
  };

  return <form action={handleSubmit}>...</form>;
}
```

---

## Common Patterns Summary

| Pattern | Use Case | Example |
|---------|----------|---------|
| `.min()/.max()` | Length constraints | `z.string().min(3).max(100)` |
| `.email()` | Email validation | `z.string().email()` |
| `.url()` | URL validation | `z.string().url()` |
| `.uuid()` | UUID validation | `z.string().uuid()` |
| `.regex()` | Custom pattern | `z.string().regex(/^[a-z0-9-]+$/)` |
| `.optional()` | Optional field | `z.string().optional()` |
| `.nullable()` | Nullable field | `z.string().nullable()` |
| `.default()` | Default value | `z.number().default(10)` |
| `.refine()` | Custom validation | `z.object({...}).refine(...)` |
| `.transform()` | Transform data | `z.string().transform(s => s.toLowerCase())` |
| `.enum()` | Enum values | `z.enum(['draft', 'published'])` |
| `.array()` | Array validation | `z.array(z.string()).max(10)` |
| `.object()` | Object validation | `z.object({ name: z.string() })` |

---

## Resources

- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Pythoughts Schemas](./src/schemas/)
- [Validation Utilities](./src/lib/validation.ts)
- [Schema Tests](./src/schemas/__tests__/)

---

## Contributing

When adding new validation schemas:

1. Create schema file in `src/schemas/`
2. Export schema and inferred types
3. Add comprehensive tests in `src/schemas/__tests__/`
4. Update this guide with examples
5. Use schemas in Server Actions
6. Document any custom validation logic

---

**Last Updated:** 2025-10-30
**Version:** 1.0.0
**Maintainer:** Pythoughts Team
