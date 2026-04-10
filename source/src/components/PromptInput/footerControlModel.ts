import type { ToolPermissionContext } from '../../Tool.js'
import type { PermissionMode } from '../../types/permissions.js'
import { getAdjacentPermissionMode } from '../../utils/permissions/getNextPermissionMode.js'
export {
  FOOTER_CONTROL_GROUPS,
  getAdjacentExecutionMode,
  getAvailableFooterControlGroups,
  getFooterExecutionModeLabel,
  getNextFooterControlGroup,
  type FooterControlGroup,
} from './footerControlCore.js'

export function getFooterPermissionMode(
  context: ToolPermissionContext,
  delta: 1 | -1,
): PermissionMode {
  return getAdjacentPermissionMode(context, delta)
}
