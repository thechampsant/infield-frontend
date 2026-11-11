"use client";

import { useParams } from "next/navigation";
import { RoomDetailPage } from "@/components/project-admin/connect/room/room-detail-page";

export default function ConnectRoomDetailRoute() {
  const params = useParams<{ accountCode: string; projectCode: string; roomId: string }>();
  const roomId = params?.roomId || "";

  return <RoomDetailPage roomId={roomId} />;
}

