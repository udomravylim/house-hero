# Profile Picture Upload Setup Guide

This guide explains how to set up profile picture upload functionality in your House Hero application.

## Overview

The profile picture feature allows users to upload and display their profile pictures. Images are stored in Supabase Storage, and the URLs are saved in the `profiles` table.

## Step-by-Step Setup Instructions

### 1. Run the SQL Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Open the file `ADD_PROFILE_PICTURE.sql`
4. Copy and paste the SQL into the editor
5. Click **Run** to execute the script

This will:
- Add a `profile_picture_url` column to the `profiles` table
- Create storage policies for the profile pictures bucket

### 2. Create the Storage Bucket (REQUIRED - Manual Step)

**Important:** You must manually create the storage bucket in Supabase Dashboard.

1. In your Supabase Dashboard, go to **Storage**
2. Click **New bucket**
3. Configure the bucket:
   - **Name:** `profile-pictures` (must match exactly)
   - **Public bucket:** ✅ **Check this box** (makes images accessible without authentication)
   - **File size limit:** 5MB (recommended)
   - **Allowed MIME types:** `image/*` (optional, for extra security)
4. Click **Create bucket**

**Why Public?**
- Profile pictures need to be accessible to display in the app
- The storage policies ensure users can only upload/delete their own pictures
- Other users can only read (view) profile pictures

### 3. Verify Storage Policies

After running the SQL script, verify the policies were created:

1. Go to **Storage** → **Policies** in your Supabase Dashboard
2. You should see 4 policies for the `profile-pictures` bucket:
   - "Users can upload their own profile picture"
   - "Users can read profile pictures"
   - "Users can update their own profile picture"
   - "Users can delete their own profile picture"

### 4. Test the Feature

1. Start your development server: `npm run dev`
2. Navigate to `/profile`
3. Click on the profile picture/avatar
4. Select an image file (JPG, PNG, etc.)
5. The image should upload and display

## How It Works

### File Storage Structure

Profile pictures are stored in Supabase Storage with the following structure:
```
profile-pictures/
  └── {userId}/
      └── {timestamp}.{extension}
```

Example: `profile-pictures/123e4567-e89b-12d3-a456-426614174000/1699123456789.jpg`

### Database Schema

The `profiles` table now includes:
- `profile_picture_url` (TEXT): Stores the public URL of the profile picture

### Security

- Users can only upload/update/delete their own profile pictures
- Users can read (view) any profile picture
- File size is limited to 5MB (enforced in frontend)
- Only image files are accepted (enforced in frontend)

## Troubleshooting

### Error: "Bucket not found"
- Make sure you created the `profile-pictures` bucket in Storage
- Verify the bucket name is exactly `profile-pictures` (case-sensitive)

### Error: "new row violates row-level security policy"
- Check that the storage policies were created successfully
- Verify the user is authenticated
- Check that the policies allow the operation you're trying to perform

### Image not displaying
- Check that the bucket is set to **Public**
- Verify the `profile_picture_url` in the database contains a valid URL
- Check browser console for CORS or network errors

### Upload fails silently
- Check browser console for error messages
- Verify file size is under 5MB
- Ensure the file is an image (JPG, PNG, GIF, etc.)
- Check that the user is authenticated

## Frontend Features

The profile page now includes:
- ✅ Clickable avatar that opens file picker
- ✅ Visual feedback during upload (spinner overlay)
- ✅ Edit icon on hover
- ✅ Automatic display of uploaded picture or default icon
- ✅ Error handling and user feedback

## Next Steps (Optional Enhancements)

1. **Image Cropping:** Add image cropping before upload
2. **Image Compression:** Compress images client-side before upload
3. **Multiple Sizes:** Generate thumbnails for different use cases
4. **Default Avatars:** Generate default avatars with initials
5. **Profile Picture in Other Views:** Display profile pictures in tasks, household members, etc.

