import { Service, signal } from '@angular/core';

@Service()
export class SidebarService {
  private readonly MOBILE_BREAKPOINT = 768;

  // Initialize based on screen size: closed on mobile/tablet, open on desktop
  isOpen = signal(this.getInitialState());

  private getInitialState(): boolean {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      return window.innerWidth >= this.MOBILE_BREAKPOINT;
    }
    // Default to true for SSR
    return true;
  }

  toggle() {
    this.isOpen.update((value) => !value);
  }

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }
}
