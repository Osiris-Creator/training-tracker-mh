const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Configure multer to use memory storage (สำหรับอัพโหลดไปยัง Supabase)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf',
                     'application/msword',
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, PDF, DOC, DOCX allowed.'));
    }
  }
});

// Helper function to upload file to Supabase Storage
async function uploadToSupabase(file) {
  const fileName = `${Date.now()}-${file.originalname}`;
  const filePath = `training-attachments/${fileName}`;

  const { data, error } = await supabase.storage
    .from('training-attachments') // ชื่อ bucket ใน Supabase (ตรงกับที่สร้างไว้)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Supabase upload error: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('training-attachments')
    .getPublicUrl(filePath);

  return publicUrl;
}

module.exports = { supabase, upload, uploadToSupabase };
