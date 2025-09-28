import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Récupérer tous les rapports avec les informations des dossiers et des auteurs
    const reportsAggregation = await db.collection("reports").aggregate([
      {
        $lookup: {
          from: "folders",
          let: { folderId: { $toObjectId: "$folderId" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$folderId"] } } }
          ],
          as: "folder"
        }
      },
      {
        $lookup: {
          from: "users",
          let: { authorId: { $toObjectId: "$authorId" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$authorId"] } } }
          ],
          as: "authorData"
        }
      },
      {
        $addFields: {
          folder: { $arrayElemAt: ["$folder", 0] },
          authorInfo: { $arrayElemAt: ["$authorData", 0] }
        }
      },
      {
        $addFields: {
          author: {
            $cond: {
              if: { $ne: ["$authorInfo", null] },
              then: {
                name: {
                  $ifNull: [
                    "$authorInfo.anonymousNickname",
                    { $ifNull: ["$authorInfo.discordUsername", "Utilisateur inconnu"] }
                  ]
                },
                discordId: "$authorInfo.discordId"
              },
              else: {
                name: { $ifNull: ["$author.name", "Auteur inconnu"] },
                discordId: { $ifNull: ["$author.discordId", "unknown"] }
              }
            }
          }
        }
      },
      {
        $project: {
          authorData: 0,
          authorInfo: 0
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: 100 // Limiter pour les performances
      }
    ]).toArray();

    return NextResponse.json(reportsAggregation);

  } catch (error) {
    console.error("Erreur chargement rapports admin:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des rapports" },
      { status: 500 }
    );
  }
}
