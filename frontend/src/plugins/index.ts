import { pluginRegistry } from '@/core/plugin'
import { yamatoCarrierPlugin } from './yamato-carrier'
import { barcodeFieldPlugin } from './barcode-field'

/**
 * 全プラグインを登録
 * main.ts から呼び出す
 */
export function registerAllPlugins(): void {
  pluginRegistry.register(yamatoCarrierPlugin)
  pluginRegistry.register(barcodeFieldPlugin)
}
