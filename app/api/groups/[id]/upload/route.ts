import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId, COLLECTIONS } from "@/lib/db";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (optional - will fallback to local storage if not configured)
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }

    const idObj = toObjectId(groupId);
    if (!idObj) {
      return NextResponse.json({ error: "Invalid Group ID" }, { status: 400 });
    }

    const groupsCollection = await getCollection(COLLECTIONS.GROUPS);

    // Check if user is admin
    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.adminId !== session.user.id) {
      return NextResponse.json({ error: "Only group admin can upload images" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return NextResponse.json({ error: "File and type are required" }, { status: 400 });
    }

    if (!['avatar', 'cover'].includes(type)) {
      return NextResponse.json({ error: "Type must be 'avatar' or 'cover'" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({
        error: "Image upload is not configured. Please set up Cloudinary environment variables."
      }, { status: 503 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `groups/${groupId}`,
          public_id: `${type}_${Date.now()}`,
          transformation: type === 'avatar' ? [
            { width: 200, height: 200, crop: 'fill' },
            { quality: 'auto' }
          ] : [
            { width: 1200, height: 300, crop: 'fill' },
            { quality: 'auto' }
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });

    const uploadResult: any = await uploadPromise;

    // Update group with new image URL
    const updateField = type === 'avatar' ? 'avatar' : 'coverImage';
    await groupsCollection.updateOne(
      { _id: idObj },
      {
        $set: {
          [updateField]: uploadResult.secure_url,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      message: `${type} uploaded successfully`,
      url: uploadResult.secure_url
    });

  } catch (error) {
    console.error("Error uploading group image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


