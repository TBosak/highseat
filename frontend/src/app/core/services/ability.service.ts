import { Injectable, inject } from '@angular/core';
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { AuthService } from './auth.service';
import type { Permission } from '../models';

// Define what subjects/resources can be acted upon
export type Subjects = 'Board' | 'Card' | 'Tab' | 'Theme' | 'User' | 'Role' | 'all';

// Define actions that can be performed
export type Actions =
  | 'view'
  | 'edit'
  | 'create'
  | 'delete'
  | 'manage' // special action that means "can do anything"
  | 'design'
  | 'add';

// Create the Ability type
export type AppAbility = MongoAbility<[Actions, Subjects]>;

@Injectable({
  providedIn: 'root'
})
export class AbilityService {
  private authService = inject(AuthService);
  private ability!: AppAbility;

  constructor() {
    this.ability = this.defineAbilitiesFor([]);

    // Update abilities when user changes
    this.authService.permissions$.subscribe(permissions => {
      this.ability = this.defineAbilitiesFor(permissions);
    });
  }

  /**
   * Define abilities based on user permissions
   */
  private defineAbilitiesFor(permissions: Permission[]): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Map permissions to CASL abilities
    permissions.forEach(permission => {
      switch (permission) {
        // Board permissions
        case 'board:view':
          can('view', 'Board');
          break;
        case 'board:edit':
          can('edit', 'Board');
          can('create', 'Board');
          can('delete', 'Board');
          break;
        case 'board:design':
          can('design', 'Board');
          break;

        // Card permissions
        case 'card:add':
          can('add', 'Card');
          can('create', 'Card');
          break;
        case 'card:edit':
          can('edit', 'Card');
          break;
        case 'card:delete':
          can('delete', 'Card');
          break;

        // Theme permissions
        case 'theme:edit':
          can('edit', 'Theme');
          can('create', 'Theme');
          can('delete', 'Theme');
          break;

        // User management
        case 'user:manage':
          can('manage', 'User');
          break;

        // Role management
        case 'role:manage':
          can('manage', 'Role');
          break;
      }
    });

    return build();
  }

  /**
   * Get the current ability instance
   */
  getAbility(): AppAbility {
    return this.ability;
  }

  /**
   * Check if user can perform an action on a subject
   */
  can(action: Actions, subject: Subjects): boolean {
    return this.ability.can(action, subject);
  }

  /**
   * Check if user cannot perform an action on a subject
   */
  cannot(action: Actions, subject: Subjects): boolean {
    return this.ability.cannot(action, subject);
  }
}
