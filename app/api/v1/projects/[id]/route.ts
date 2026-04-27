import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { extractUserIdFromRequest } from "@/lib/api/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logAPIRequest } from "@/lib/api/logging";
import { checkRateLimit, getRateLimitKey } from "@/lib/api/rateLimit";
import connectToDatabase from "@/lib/mongodb/connect";
import { Project } from "@/models/Project";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    const startTime = Date.now();
    const { id } = await params;
    let userId: string | null = null;
    try {
        userId = await extractUserIdFromRequest(req);
        if (!userId) {
            logAPIRequest(req, 401, Date.now() - startTime, undefined, "Unauthorized");
            return errorResponse("UNAUTHORIZED", undefined, 401);
        }
        const rateLimitKey = getRateLimitKey(req, userId);
        const rateLimit = checkRateLimit(rateLimitKey);
        if (!rateLimit.allowed) {
            logAPIRequest(req, 429, Date.now() - startTime, userId, "Rate limited");
            return errorResponse("RATE_LIMITED", undefined, 429);
        }
        await connectToDatabase();
        if (!mongoose.Types.ObjectId.isValid(id)) {
            logAPIRequest(req, 400, Date.now() - startTime, userId, "Invalid project ID");
            return errorResponse("BAD_REQUEST", "Invalid project ID format");
        }
        const project = await Project.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId),
        }).lean();
        if (!project) {
            logAPIRequest(req, 404, Date.now() - startTime, userId, "Project not found");
            return errorResponse("NOT_FOUND", "Project not found", 404);
        }
        logAPIRequest(req, 200, Date.now() - startTime, userId);
        return successResponse({
            id: project._id.toString(),
            name: project.name,
            created_at: project.createdAt,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logAPIRequest(req, 500, Date.now() - startTime, userId ?? undefined, message);
        return errorResponse("INTERNAL_ERROR", message, 500);
    }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
    const startTime = Date.now();
    const { id } = await params;
    let userId: string | null = null;
    try {
        userId = await extractUserIdFromRequest(req);
        if (!userId) {
            logAPIRequest(req, 401, Date.now() - startTime, undefined, "Unauthorized");
            return errorResponse("UNAUTHORIZED", undefined, 401);
        }
        const rateLimitKey = getRateLimitKey(req, userId);
        const rateLimit = checkRateLimit(rateLimitKey);
        if (!rateLimit.allowed) {
            logAPIRequest(req, 429, Date.now() - startTime, userId, "Rate limited");
            return errorResponse("RATE_LIMITED", undefined, 429);
        }
        await connectToDatabase();
        if (!mongoose.Types.ObjectId.isValid(id)) {
            logAPIRequest(req, 400, Date.now() - startTime, userId, "Invalid project ID");
            return errorResponse("BAD_REQUEST", "Invalid project ID format");
        }
        const project = await Project.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId),
        });
        if (!project) {
            logAPIRequest(req, 404, Date.now() - startTime, userId, "Project not found");
            return errorResponse("NOT_FOUND", "Project not found", 404);
        }
        logAPIRequest(req, 200, Date.now() - startTime, userId);
        return successResponse({
            message: "Project deleted successfully",
            id: project._id.toString(),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logAPIRequest(req, 500, Date.now() - startTime, userId ?? undefined, message);
        return errorResponse("INTERNAL_ERROR", message, 500);
    }
}