from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
import asyncio
import yfinance as yf

app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# WebSocket connections store
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, Set[str]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[websocket] = set()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]

    async def subscribe(self, websocket: WebSocket, symbol: str):
        self.active_connections[websocket].add(symbol)

    async def unsubscribe(self, websocket: WebSocket, symbol: str):
        self.active_connections[websocket].remove(symbol)

    async def broadcast_stock(self, stock_data: dict):
        for websocket, symbols in self.active_connections.items():
            if stock_data['symbol'] in symbols:
                await websocket.send_json(stock_data)

manager = ConnectionManager()

@app.websocket("/ws/stocks")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data['action'] == 'subscribe':
                await manager.subscribe(websocket, data['symbol'])
            elif data['action'] == 'unsubscribe':
                await manager.unsubscribe(websocket, data['symbol'])
    except:
        manager.disconnect(websocket)

@app.post("/api/alerts")
async def create_alert(
    alert: PriceAlert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_alert = Alert(
        user_id=current_user.id,
        stock_symbol=alert.stock_symbol,
        target_price=alert.target_price,
        condition=alert.condition
    )
    db.add(db_alert)
    db.commit()
    return db_alert

@app.post("/api/watchlists/{watchlist_id}/stocks")
async def add_to_watchlist(
    watchlist_id: str,
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    watchlist = db.query(Watchlist).filter_by(
        id=watchlist_id,
        user_id=current_user.id
    ).first()
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    watchlist.stocks.append(symbol)
    db.commit()
    return {"message": "Stock added to watchlist"} 