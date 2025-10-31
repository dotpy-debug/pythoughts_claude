# Zod Validation Quick Reference

> Quick reference for using Zod validation in Pythoughts Server Actions

## Import Patterns

```typescript
// Common utilities
import { validateSchema } from '@/lib/validation';

// Specific schemas
import { createPostSchema, type CreatePostInput } from '@/schemas/posts';

// Or import from index
import { createPostSchema, type CreatePostInput } from '@/schemas';
```

---

## Server Action Pattern

```typescript
'use server';

import { validateSchema } from '@/lib/validation';
import { yourSchema } from '@/schemas/your-domain';

export async function yourAction(input: unknown) {
  // 1. Validate
  const validation = validateSchema(yourSchema, input);

  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      errors: validation.errors, // Field-level errors
    };
  }

  // 2. Use validated data (fully typed!)
  const validatedData = validation.data;

  // 3. Execute business logic
  try {
    const result = await database.operation(validatedData);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: 'Operation failed' };
  }
}
```

---

## Common Schemas

| Schema | Purpose | Example |
|--------|---------|---------|
| `emailSchema` | Email validation | `email: emailSchema` |
| `passwordSchema` | Strong password | `password: passwordSchema` |
| `uuidSchema` | UUID validation | `id: uuidSchema` |
| `slugSchema` | URL-safe slug | `slug: slugSchema` |
| `urlSchema` | Full URL | `website: urlSchema` |
| `usernameSchema` | Username | `username: usernameSchema` |
| `hexColorSchema` | Color code | `color: hexColorSchema` |

---

## Creating New Schemas

```typescript
// 1. Define schema
import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';

export const mySchema = z.object({
  id: uuidSchema,
  name: z.string().min(3).max(100),
  tags: z.array(z.string()).max(10),
  isActive: z.boolean().default(true),
});

// 2. Export type
export type MyInput = z.infer<typeof mySchema>;
```

---

## Validation Modifiers

```typescript
// Optional field
field: z.string().optional()

// Nullable field
field: z.string().nullable()

// Default value
field: z.number().default(10)

// Optional OR empty string
field: z.string().optional().or(z.literal(''))

// Array with limits
tags: z.array(z.string()).min(1).max(10)

// Enum values
status: z.enum(['draft', 'published', 'archived'])
```

---

## Custom Validations

```typescript
// Refinement
const schema = z.object({
  password: z.string(),
  confirm: z.string(),
}).refine(
  (data) => data.password === data.confirm,
  {
    message: 'Passwords must match',
    path: ['confirm'], // Error shows on confirm field
  }
);

// Transformation
const schema = z.string().transform(s => s.toLowerCase());
```

---

## Error Handling

```typescript
// Server Action
const validation = validateSchema(schema, input);

if (!validation.success) {
  // validation.errors = { fieldName: ['error1', 'error2'] }
  return {
    success: false,
    error: 'Validation failed',
    errors: validation.errors,
  };
}

// Client-side
const result = await serverAction(data);

if (!result.success && result.errors) {
  Object.entries(result.errors).forEach(([field, messages]) => {
    console.error(`${field}: ${messages.join(', ')}`);
  });
}
```

---

## Testing Schemas

```typescript
import { describe, it, expect } from 'vitest';
import { mySchema } from '../my-schema';

describe('mySchema', () => {
  it('should validate valid data', () => {
    const result = mySchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid data', () => {
    const result = mySchema.safeParse({ name: '' });

    expect(result.success).toBe(false);
  });
});
```

---

## Common Patterns

### Pagination
```typescript
import { paginationSchema } from '@/lib/validation';

const schema = z.object({
  ...paginationSchema.shape,
  search: z.string().optional(),
});
```

### Partial Updates
```typescript
const createSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const updateSchema = createSchema.partial().extend({
  id: uuidSchema,
});
```

### Discriminated Union
```typescript
const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), data: createSchema }),
  z.object({ type: z.literal('update'), data: updateSchema }),
]);
```

---

## File Locations

```
src/
├── lib/validation.ts          # Common utilities
├── schemas/
│   ├── index.ts               # Central exports
│   ├── auth.ts                # Auth schemas
│   ├── posts.ts               # Post schemas
│   ├── categories.ts          # Category schemas
│   ├── tags.ts                # Tag schemas
│   ├── comments.ts            # Comment schemas
│   ├── profiles.ts            # Profile schemas
│   └── __tests__/             # Schema tests
└── actions/
    ├── posts-validated.ts     # Validated actions
    ├── categories-validated.ts
    └── tags-validated.ts
```

---

## Type Safety

```typescript
// ✅ Good - Type inferred from schema
type CreatePost = z.infer<typeof createPostSchema>;

// ❌ Bad - Manual type (can drift from schema)
type CreatePost = {
  title: string;
  content: string;
};

// ✅ Good - Unknown input type
export async function action(input: unknown) {
  const validation = validateSchema(schema, input);
  // ...
}

// ❌ Bad - Trusted input type
export async function action(input: MyType) {
  // No runtime validation!
}
```

---

## Helpful Commands

```bash
# Run schema tests
npm run test:unit -- src/schemas/__tests__

# Type check
npm run typecheck

# Run all tests
npm run test:all
```

---

## Resources

- [Full Guide](./ZOD_VALIDATION_GUIDE.md)
- [Implementation Summary](./ZOD_VALIDATION_IMPLEMENTATION_SUMMARY.md)
- [Zod Docs](https://zod.dev/)
- [Schema Files](./src/schemas/)

---

**Last Updated:** 2025-10-30
