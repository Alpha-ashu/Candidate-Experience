from typing import Dict, Set
from fastapi import WebSocket


class InMemoryBroker:
    def __init__(self) -> None:
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def join(self, room: str, ws: WebSocket) -> None:
        self.rooms.setdefault(room, set()).add(ws)

    async def leave(self, room: str, ws: WebSocket) -> None:
        if room in self.rooms:
            self.rooms[room].discard(ws)
            if not self.rooms[room]:
                del self.rooms[room]

    async def emit(self, room: str, message: dict) -> None:
        if room not in self.rooms:
            return
        dead: Set[WebSocket] = set()
        for ws in self.rooms[room]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        for d in dead:
            await self.leave(room, d)


broker = InMemoryBroker()
