import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Board } from '../models';

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  private http = inject(HttpClient);
  private apiUrl = '/api/boards';

  getBoards(): Observable<Board[]> {
    return this.http.get<Board[]>(this.apiUrl);
  }

  getBoard(boardId: string): Observable<Board> {
    return this.http.get<Board>(`${this.apiUrl}/${boardId}`);
  }

  createBoard(board: Partial<Board>): Observable<Board> {
    return this.http.post<Board>(this.apiUrl, board);
  }

  updateBoard(boardId: string, board: Partial<Board>): Observable<Board> {
    return this.http.patch<Board>(`${this.apiUrl}/${boardId}`, board);
  }

  deleteBoard(boardId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${boardId}`);
  }

  lockBoard(boardId: string, locked: boolean): Observable<Board> {
    return this.updateBoard(boardId, { isLocked: locked });
  }
}
