import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private http = inject(HttpClient);
  private apiUrl = '/api/roles';

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.apiUrl);
  }

  getRole(roleId: string): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/${roleId}`);
  }

  createRole(data: CreateRoleData): Observable<Role> {
    return this.http.post<Role>(this.apiUrl, data);
  }

  updateRole(roleId: string, data: UpdateRoleData): Observable<Role> {
    return this.http.patch<Role>(`${this.apiUrl}/${roleId}`, data);
  }

  deleteRole(roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${roleId}`);
  }
}
