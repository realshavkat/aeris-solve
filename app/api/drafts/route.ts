import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const folderId = request.nextUrl.searchParams.get("folderId");
    if (!folderId) {
      return NextResponse.json({ error: "folderId manquant" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const drafts = await db.collection("drafts")
      .find({
        folderId,
        authorId: session.user.id
      })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(drafts);
  } catch (error) {
    console.error("Erreur chargement brouillons:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des brouillons" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { db } = await connectToDatabase();
    
    const newDraft = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: session.user.id
    };

    const result = await db.collection("drafts").insertOne(newDraft);
    
    if (!result.insertedId) {
      throw new Error("Erreur lors de la création du brouillon");
    }

    const createdDraft = await db.collection("drafts").findOne({ 
      _id: result.insertedId 
    });

    return NextResponse.json(createdDraft);
  } catch (error) {
    console.error("Erreur création brouillon:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du brouillon" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { draftId, ...updateData } = body;
    const { db } = await connectToDatabase();

    const result = await db.collection("drafts").updateOne(
      { 
        _id: new ObjectId(draftId),
        authorId: session.user.id
      },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json(
        { error: "Brouillon non trouvé" },
        { status: 404 }
      );
    }

    const updatedDraft = await db.collection("drafts").findOne({
      _id: new ObjectId(draftId)
    });

    return NextResponse.json(updatedDraft);
  } catch (error) {
    console.error("Erreur modification brouillon:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification du brouillon" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const result = await db.collection("drafts").deleteOne({
      _id: new ObjectId(id),
      authorId: session.user.id
    });

    if (!result.deletedCount) {
      return NextResponse.json(
        { error: "Brouillon non trouvé" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erreur suppression brouillon:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du brouillon" },
      { status: 500 }
    );
  }
}
