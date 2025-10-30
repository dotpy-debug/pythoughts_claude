# Blog Images Fix - Quick Test Guide

## 🚀 Quick Start

Run the development server:
```bash
bun run dev
```

## ✅ 5-Minute Verification

### 1. Check Console (0 errors expected)
Open DevTools Console → Should see **NO**:
- ❌ CSP violations
- ❌ Failed image loads
- ❌ 404 errors for images

### 2. Test Cover Images
Visit any blog post:
```
http://localhost:5173/blog/[any-slug]
```

**Expected:**
- ✅ Cover image displays at top
- ✅ No broken image placeholder
- ✅ Image has hover effect (slight zoom)

### 3. Test Blog Cards
Visit blog list:
```
http://localhost:5173/blogs
```

**Expected:**
- ✅ All blog cards show images
- ✅ Images lazy-load as you scroll
- ✅ Shimmer animation during load

### 4. Test Landing Page
Visit homepage:
```
http://localhost:5173/
```

**Expected:**
- ✅ Featured blog images load
- ✅ Blog of the Day image loads
- ✅ Latest blogs images load

## 🔍 Detailed Testing

### Test CSP Headers

**Chrome DevTools:**
1. Open DevTools → Network tab
2. Reload page
3. Click any image request
4. Check Response Headers → Look for `Content-Security-Policy`
5. Verify includes: `img-src ... https://*.supabase.co ...`

**Expected header:**
```
img-src 'self' blob: data: https://*.supabase.co https://*.supabase.in https://images.pexels.com https://images.unsplash.com https:
```

### Test Image Upload

**Blog Editor:**
1. Go to `/blog/new`
2. Click image upload button
3. Upload a test image
4. **Expected:** Image uploads and displays in preview

**Pexels Search:**
1. In editor, open Pexels search modal
2. Search for "nature"
3. Select an image
4. **Expected:** Image inserts into editor

### Test Error Handling

**Simulate Failed Load:**
1. Open DevTools → Network tab
2. Add blocked URL pattern: `*.supabase.co`
3. Reload blog page
4. **Expected:**
   - ✅ Console shows warning: "Failed to load image"
   - ✅ Broken image is hidden (not visible)
   - ✅ Page layout intact

## 📊 Performance Checks

### Lazy Loading

**Test:**
1. Open blog list page
2. Open DevTools → Network tab
3. Scroll slowly down the page

**Expected:**
- ✅ Images load as they enter viewport
- ✅ Not all images load at once
- ✅ "Initiator: IntersectionObserver" in Network tab

### Loading States

**Test:**
1. Open DevTools → Network tab
2. Throttle to "Slow 3G"
3. Reload blog page

**Expected:**
- ✅ Shimmer animation shows while loading
- ✅ Smooth transition when image appears
- ✅ No layout shift

## 🐛 Common Issues

### Images Not Loading

**Check:**
1. Browser Console - any errors?
2. Network tab - what's the response status?
3. Image URL format - is it absolute?

**Example valid URL:**
```
https://abc123.supabase.co/storage/v1/object/public/images/uploads/user123/image.jpg
```

### CSP Blocking Images

**Symptom:**
```
Refused to load the image 'https://...' because it violates CSP
```

**Fix:**
Add domain to `src/middleware.ts` line 15

### Broken Image Placeholder

**Symptom:** See broken image icon

**Fix:**
- Check `onError` handler is present
- Verify image URL in database
- Test URL directly in browser

## 🔧 Debug Commands

### Check Database

```sql
-- See all posts with images
SELECT id, title, image_url, created_at 
FROM posts 
WHERE image_url IS NOT NULL 
AND post_type = 'blog' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Test Image URL

```bash
# Test if image is accessible
curl -I https://your-project.supabase.co/storage/v1/object/public/images/...
```

**Expected:** `HTTP/1.1 200 OK`

### Check Supabase Storage

```bash
# List files in storage bucket
supabase storage ls images
```

## 📝 Test Checklist

- [ ] Dev server runs without errors
- [ ] Blog detail page shows cover image
- [ ] Blog list page shows thumbnail images
- [ ] Landing page shows all section images
- [ ] No CSP errors in console
- [ ] No 404 errors for images
- [ ] Images lazy-load below fold
- [ ] Hover effects work on images
- [ ] Image upload works in editor
- [ ] Pexels search works in editor
- [ ] Error handling hides broken images
- [ ] Shimmer animation shows during load

## 🎯 Success Criteria

All of the following should be true:

1. ✅ **Zero CSP violations** in console
2. ✅ **All images display** correctly
3. ✅ **No broken placeholders** visible
4. ✅ **Lazy loading** works below fold
5. ✅ **Upload works** in blog editor
6. ✅ **Performance** is good (< 500ms load)

## 📞 Need Help?

If tests fail, check:
1. `IMAGE_FIX_SUMMARY.md` - Full documentation
2. Console errors - What's the exact error?
3. Network tab - What's the status code?
4. Supabase Dashboard - Is storage public?

## 🚢 Ready for Production?

Before deploying:
- [ ] All tests pass ✅
- [ ] Performance is acceptable
- [ ] No console errors
- [ ] Tested on multiple browsers
- [ ] Tested with slow network
- [ ] Supabase storage permissions correct
- [ ] CSP headers allow necessary domains

---

**Quick Test Date:** 2025-10-30
**Status:** Ready for testing
