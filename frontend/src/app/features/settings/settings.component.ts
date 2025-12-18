import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPlus, faTrash, faEdit, faSpinner, faUser } from '@fortawesome/free-solid-svg-icons';
import { BoardService } from '../../core/services/board.service';
import { UserService, CreateUserData, UpdateUserData } from '../../core/services/user.service';
import { RoleService, Role, CreateRoleData, UpdateRoleData } from '../../core/services/role.service';
import { AuthService } from '../../core/services/auth.service';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import type { Board, User, Permission } from '../../core/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, HasPermissionDirective],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit {
  private boardService = inject(BoardService);
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Icons
  faArrowLeft = faArrowLeft;
  faPlus = faPlus;
  faTrash = faTrash;
  faEdit = faEdit;
  faSpinner = faSpinner;
  faUser = faUser;

  // Board management
  boards = signal<Board[]>([]);
  loading = signal(true);
  showCreateModal = signal(false);
  showEditModal = signal(false);
  editingBoard = signal<Board | null>(null);
  newBoardName = signal('');
  newBoardSlug = signal('');

  // User management
  users = signal<User[]>([]);
  usersLoading = signal(true);
  showCreateUserModal = signal(false);
  showEditUserModal = signal(false);
  editingUser = signal<User | null>(null);
  newUsername = signal('');
  newUserPassword = signal('');
  newUserDisplayName = signal('');
  newUserRoles = signal<string[]>(['viewer']);

  // Role management
  roles = signal<Role[]>([]);
  rolesLoading = signal(true);
  showCreateRoleModal = signal(false);
  showEditRoleModal = signal(false);
  editingRole = signal<Role | null>(null);
  newRoleName = signal('');
  newRoleDescription = signal('');
  newRolePermissions = signal<Permission[]>([]);

  // Computed property for available role names (for user assignment)
  availableRoles = computed(() => this.roles().map(role => role.name));

  availablePermissions: Permission[] = [
    'board:view',
    'board:edit',
    'board:design',
    'card:add',
    'card:edit',
    'card:delete',
    'theme:edit',
    'role:manage',
    'user:manage'
  ];

  // User preferences
  user = this.authService.user;
  hideLogo = signal(false);

  // Expanded permissions tracking
  expandedPermissions = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadBoards();
    this.loadUsers();
    this.loadRoles();

    // Initialize hideLogo from user data
    const currentUser = this.user();
    if (currentUser) {
      this.hideLogo.set(currentUser.hideLogo || false);
    }
  }

  loadBoards(): void {
    this.loading.set(true);
    this.boardService.getBoards().subscribe({
      next: (boards) => {
        this.boards.set(boards);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load boards:', err);
        this.loading.set(false);
      }
    });
  }

  createBoard(): void {
    if (!this.newBoardName() || !this.newBoardSlug()) {
      return;
    }

    this.boardService.createBoard({
      name: this.newBoardName(),
      slug: this.newBoardSlug()
    }).subscribe({
      next: (board) => {
        this.boards.update(boards => [...boards, board]);
        this.showCreateModal.set(false);
        this.newBoardName.set('');
        this.newBoardSlug.set('');
      },
      error: (err) => {
        console.error('Failed to create board:', err);
      }
    });
  }

  startEditBoard(board: Board): void {
    this.editingBoard.set(board);
    this.newBoardName.set(board.name);
    this.newBoardSlug.set(board.slug);
    this.showEditModal.set(true);
  }

  updateBoard(): void {
    const board = this.editingBoard();
    if (!board || !this.newBoardName() || !this.newBoardSlug()) {
      return;
    }

    this.boardService.updateBoard(board.id, {
      name: this.newBoardName(),
      slug: this.newBoardSlug()
    }).subscribe({
      next: (updatedBoard) => {
        this.boards.update(boards =>
          boards.map(b => (b.id === updatedBoard.id ? updatedBoard : b))
        );
        this.showEditModal.set(false);
        this.editingBoard.set(null);
        this.newBoardName.set('');
        this.newBoardSlug.set('');
      },
      error: (err) => {
        console.error('Failed to update board:', err);
      }
    });
  }

  deleteBoard(board: Board, event: Event): void {
    event.stopPropagation();

    if (!confirm(`Delete board "${board.name}"? This will also delete all tabs and cards.`)) {
      return;
    }

    this.boardService.deleteBoard(board.id).subscribe({
      next: () => {
        this.boards.update(boards => boards.filter(b => b.id !== board.id));
      },
      error: (err) => {
        console.error('Failed to delete board:', err);
      }
    });
  }

  generateSlug(): void {
    const slug = this.newBoardName()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    this.newBoardSlug.set(slug);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  // User Management Methods

  loadUsers(): void {
    this.usersLoading.set(true);
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.usersLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.usersLoading.set(false);
      }
    });
  }

  openCreateUserModal(): void {
    this.newUsername.set('');
    this.newUserPassword.set('');
    this.newUserDisplayName.set('');
    this.newUserRoles.set(['viewer']);
    this.showCreateUserModal.set(true);
  }

  createUser(): void {
    if (!this.newUsername() || !this.newUserPassword()) {
      return;
    }

    const userData: CreateUserData = {
      username: this.newUsername(),
      password: this.newUserPassword(),
      displayName: this.newUserDisplayName() || undefined,
      roles: this.newUserRoles()
    };

    this.userService.createUser(userData).subscribe({
      next: (user) => {
        this.users.update(users => [...users, user]);
        this.showCreateUserModal.set(false);
        this.clearUserForm();
      },
      error: (err) => {
        console.error('Failed to create user:', err);
        alert(err.error?.error || 'Failed to create user');
      }
    });
  }

  startEditUser(user: User): void {
    this.editingUser.set(user);
    this.newUsername.set(user.username);
    this.newUserPassword.set('');
    this.newUserDisplayName.set(user.displayName || '');
    this.newUserRoles.set(user.roles);
    this.showEditUserModal.set(true);
  }

  updateUser(): void {
    const user = this.editingUser();
    if (!user || !this.newUsername()) {
      return;
    }

    const updateData: UpdateUserData = {
      username: this.newUsername(),
      displayName: this.newUserDisplayName() || undefined,
      roles: this.newUserRoles()
    };

    if (this.newUserPassword()) {
      updateData.password = this.newUserPassword();
    }

    this.userService.updateUser(user.id, updateData).subscribe({
      next: (updatedUser) => {
        this.users.update(users =>
          users.map(u => (u.id === updatedUser.id ? updatedUser : u))
        );
        this.showEditUserModal.set(false);
        this.editingUser.set(null);
        this.clearUserForm();
      },
      error: (err) => {
        console.error('Failed to update user:', err);
        alert(err.error?.error || 'Failed to update user');
      }
    });
  }

  deleteUser(user: User, event: Event): void {
    event.stopPropagation();

    if (!confirm(`Delete user "${user.username}"? This action cannot be undone.`)) {
      return;
    }

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update(users => users.filter(u => u.id !== user.id));
      },
      error: (err) => {
        console.error('Failed to delete user:', err);
        alert(err.error?.error || 'Failed to delete user');
      }
    });
  }

  toggleRole(role: string): void {
    const currentRoles = this.newUserRoles();
    if (currentRoles.includes(role)) {
      this.newUserRoles.set(currentRoles.filter(r => r !== role));
    } else {
      this.newUserRoles.set([...currentRoles, role]);
    }
  }

  private clearUserForm(): void {
    this.newUsername.set('');
    this.newUserPassword.set('');
    this.newUserDisplayName.set('');
    this.newUserRoles.set(['viewer']);
  }

  // Role Management Methods

  loadRoles(): void {
    this.rolesLoading.set(true);
    this.roleService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.rolesLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load roles:', err);
        this.rolesLoading.set(false);
      }
    });
  }

  openCreateRoleModal(): void {
    this.newRoleName.set('');
    this.newRoleDescription.set('');
    this.newRolePermissions.set([]);
    this.showCreateRoleModal.set(true);
  }

  createRole(): void {
    if (!this.newRoleName() || this.newRolePermissions().length === 0) {
      return;
    }

    const roleData: CreateRoleData = {
      name: this.newRoleName(),
      description: this.newRoleDescription() || undefined,
      permissions: this.newRolePermissions()
    };

    this.roleService.createRole(roleData).subscribe({
      next: (role) => {
        this.roles.update(roles => [...roles, role]);
        this.showCreateRoleModal.set(false);
        this.clearRoleForm();
      },
      error: (err) => {
        console.error('Failed to create role:', err);
        alert(err.error?.error || 'Failed to create role');
      }
    });
  }

  startEditRole(role: Role): void {
    this.editingRole.set(role);
    this.newRoleName.set(role.name);
    this.newRoleDescription.set(role.description || '');
    this.newRolePermissions.set(role.permissions as Permission[]);
    this.showEditRoleModal.set(true);
  }

  updateRole(): void {
    const role = this.editingRole();
    if (!role || !this.newRoleName() || this.newRolePermissions().length === 0) {
      return;
    }

    const updateData: UpdateRoleData = {
      name: this.newRoleName(),
      description: this.newRoleDescription() || undefined,
      permissions: this.newRolePermissions()
    };

    this.roleService.updateRole(role.id, updateData).subscribe({
      next: (updatedRole) => {
        this.roles.update(roles =>
          roles.map(r => (r.id === updatedRole.id ? updatedRole : r))
        );
        this.showEditRoleModal.set(false);
        this.editingRole.set(null);
        this.clearRoleForm();
      },
      error: (err) => {
        console.error('Failed to update role:', err);
        alert(err.error?.error || 'Failed to update role');
      }
    });
  }

  deleteRole(role: Role, event: Event): void {
    event.stopPropagation();

    if (role.isSystem) {
      alert('Cannot delete system roles');
      return;
    }

    if (!confirm(`Delete role "${role.name}"? This action cannot be undone.`)) {
      return;
    }

    this.roleService.deleteRole(role.id).subscribe({
      next: () => {
        this.roles.update(roles => roles.filter(r => r.id !== role.id));
      },
      error: (err) => {
        console.error('Failed to delete role:', err);
        alert(err.error?.error || 'Failed to delete role');
      }
    });
  }

  togglePermission(permission: Permission): void {
    const currentPermissions = this.newRolePermissions();
    if (currentPermissions.includes(permission)) {
      this.newRolePermissions.set(currentPermissions.filter(p => p !== permission));
    } else {
      this.newRolePermissions.set([...currentPermissions, permission]);
    }
  }

  private clearRoleForm(): void {
    this.newRoleName.set('');
    this.newRoleDescription.set('');
    this.newRolePermissions.set([]);
  }

  // Permissions Expansion Methods

  togglePermissionsExpanded(roleId: string): void {
    this.expandedPermissions.update(expanded => {
      const newSet = new Set(expanded);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  }

  isPermissionsExpanded(roleId: string): boolean {
    return this.expandedPermissions().has(roleId);
  }

  // User Preferences Methods

  toggleHideLogo(): void {
    const newValue = !this.hideLogo();
    this.hideLogo.set(newValue);

    this.userService.updatePreferences({ hideLogo: newValue }).subscribe({
      next: (updatedUser) => {
        // Update the user in AuthService
        this.authService.updateUser(updatedUser);
      },
      error: (err) => {
        console.error('Failed to update preference:', err);
        // Revert on error
        this.hideLogo.set(!newValue);
        alert('Failed to update preference');
      }
    });
  }
}
