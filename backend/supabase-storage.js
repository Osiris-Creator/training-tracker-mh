const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BUCKET_NAME = 'training-attachments';

/**
 * Upload file to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} Public URL
 */
async function uploadFile(fileBuffer, fileName, mimeType) {
  const timestamp = Date.now();
  const fileExt = fileName.split('.').pop();
  const filePath = `${timestamp}-${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Delete file from Supabase Storage
 * @param {string} fileUrl - Public URL of the file
 * @returns {Promise<void>}
 */
async function deleteFile(fileUrl) {
  // Extract file path from URL
  const urlParts = fileUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
  if (urlParts.length < 2) {
    throw new Error('Invalid file URL');
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

module.exports = {
  uploadFile,
  deleteFile
};
