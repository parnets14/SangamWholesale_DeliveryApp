/**
 * Shared navigation ref.
 *
 * Uses createNavigationContainerRef from @react-navigation/native so the ref
 * has .navigate(), .goBack() etc. available directly — unlike a plain createRef.
 *
 * Usage:
 *   <NavigationContainer ref={navigationRef}>
 *
 * Navigate from anywhere:
 *   import { navigate } from '../services/navigationRef';
 *   navigate('OrderList', { orderType: 'Orders' });
 */
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
