import { c as _c } from "react/compiler-runtime";
import * as React from 'react';
import { getMainLoopProviderRuntimeSnapshot } from '../../services/api/providerRuntime.js';
import { Box, Link, Text } from '../../ink.js';
import { PRODUCT_DOCS_URL, PRODUCT_OPENAI_DOCS_URL } from '../../constants/product.js';
import { PromptInputHelpMenu } from '../PromptInput/PromptInputHelpMenu.js';
export function General() {
  const $ = _c(9);
  const runtime = getMainLoopProviderRuntimeSnapshot();
  const openAiRuntimeActive = runtime.execution.family === 'openai';
  const openAiCapabilities = runtime.execution.family === 'openai' ? runtime.routedOpenAiModelCapabilities.join(', ') : '';
  let t0;
  if ($[0] !== openAiCapabilities || $[1] !== openAiRuntimeActive) {
    t0 = <Box><Text>{openAiRuntimeActive ? `OpenAI/Codex runtime is active here. Use /status to inspect the live tool surface for this session${openAiCapabilities ? `: ${openAiCapabilities}` : ''}.` : 'CT understands your codebase, makes edits with your permission, and executes commands right from your terminal.'}</Text></Box>;
    $[0] = openAiCapabilities;
    $[1] = openAiRuntimeActive;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  let t1;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <Box flexDirection="column" gap={1}><Box><Text bold={true}>Docs</Text></Box><Box><Text>/status for live runtime truth · /login for auth · /model for model selection · /mcp for integrations</Text></Box><Box><Text>Feature router: <Link url={PRODUCT_DOCS_URL} /></Text></Box><Box><Text>OpenAI runtime guide: <Link url={PRODUCT_OPENAI_DOCS_URL} /></Text></Box></Box>;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  let t2;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <Box flexDirection="column"><Box><Text bold={true}>Shortcuts</Text></Box><PromptInputHelpMenu gap={2} fixedWidth={true} /></Box>;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  let t3;
  if ($[5] !== t0 || $[6] !== t1 || $[7] !== t2) {
    t3 = <Box flexDirection="column" paddingY={1} gap={1}>{t0}{t1}{t2}</Box>;
    $[5] = t0;
    $[6] = t1;
    $[7] = t2;
    $[8] = t3;
  } else {
    t3 = $[8];
  }
  return t3;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJSZWFjdCIsIkJveCIsIlRleHQiLCJQcm9tcHRJbnB1dEhlbHBNZW51IiwiR2VuZXJhbCIsIiQiLCJfYyIsInQwIiwiU3ltYm9sIiwiZm9yIiwidDEiXSwic291cmNlcyI6WyJHZW5lcmFsLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBSZWFjdCBmcm9tICdyZWFjdCdcbmltcG9ydCB7IEJveCwgVGV4dCB9IGZyb20gJy4uLy4uL2luay5qcydcbmltcG9ydCB7IFByb21wdElucHV0SGVscE1lbnUgfSBmcm9tICcuLi9Qcm9tcHRJbnB1dC9Qcm9tcHRJbnB1dEhlbHBNZW51LmpzJ1xuXG5leHBvcnQgZnVuY3Rpb24gR2VuZXJhbCgpOiBSZWFjdC5SZWFjdE5vZGUge1xuICByZXR1cm4gKFxuICAgIDxCb3ggZmxleERpcmVjdGlvbj1cImNvbHVtblwiIHBhZGRpbmdZPXsxfSBnYXA9ezF9PlxuICAgICAgPEJveD5cbiAgICAgICAgPFRleHQ+XG4gICAgICAgICAgQ2xhdWRlIHVuZGVyc3RhbmRzIHlvdXIgY29kZWJhc2UsIG1ha2VzIGVkaXRzIHdpdGggeW91ciBwZXJtaXNzaW9uLFxuICAgICAgICAgIGFuZCBleGVjdXRlcyBjb21tYW5kcyDigJQgcmlnaHQgZnJvbSB5b3VyIHRlcm1pbmFsLlxuICAgICAgICA8L1RleHQ+XG4gICAgICA8L0JveD5cbiAgICAgIDxCb3ggZmxleERpcmVjdGlvbj1cImNvbHVtblwiPlxuICAgICAgICA8Qm94PlxuICAgICAgICAgIDxUZXh0IGJvbGQ+U2hvcnRjdXRzPC9UZXh0PlxuICAgICAgICA8L0JveD5cbiAgICAgICAgPFByb21wdElucHV0SGVscE1lbnUgZ2FwPXsyfSBmaXhlZFdpZHRoPXt0cnVlfSAvPlxuICAgICAgPC9Cb3g+XG4gICAgPC9Cb3g+XG4gIClcbn1cbiJdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sS0FBS0EsS0FBSyxNQUFNLE9BQU87QUFDOUIsU0FBU0MsR0FBRyxFQUFFQyxJQUFJLFFBQVEsY0FBYztBQUN4QyxTQUFTQyxtQkFBbUIsUUFBUSx1Q0FBdUM7QUFFM0UsT0FBTyxTQUFBQyxRQUFBO0VBQUEsTUFBQUMsQ0FBQSxHQUFBQyxFQUFBO0VBQUEsSUFBQUMsRUFBQTtFQUFBLElBQUFGLENBQUEsUUFBQUcsTUFBQSxDQUFBQyxHQUFBO0lBR0RGLEVBQUEsSUFBQyxHQUFHLENBQ0YsQ0FBQyxJQUFJLENBQUMscUhBR04sRUFIQyxJQUFJLENBSVAsRUFMQyxHQUFHLENBS0U7SUFBQUYsQ0FBQSxNQUFBRSxFQUFBO0VBQUE7SUFBQUEsRUFBQSxHQUFBRixDQUFBO0VBQUE7RUFBQSxJQUFBSyxFQUFBO0VBQUEsSUFBQUwsQ0FBQSxRQUFBRyxNQUFBLENBQUFDLEdBQUE7SUFOUkMsRUFBQSxJQUFDLEdBQUcsQ0FBZSxhQUFRLENBQVIsUUFBUSxDQUFXLFFBQUMsQ0FBRCxHQUFDLENBQU8sR0FBQyxDQUFELEdBQUMsQ0FDN0MsQ0FBQUgsRUFLSyxDQUNMLENBQUMsR0FBRyxDQUFlLGFBQVEsQ0FBUixRQUFRLENBQ3pCLENBQUMsR0FBRyxDQUNGLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBSixLQUFHLENBQUMsQ0FBQyxTQUFTLEVBQW5CLElBQUksQ0FDUCxFQUZDLEdBQUcsQ0FHSixDQUFDLG1CQUFtQixDQUFNLEdBQUMsQ0FBRCxHQUFDLENBQWMsVUFBSSxDQUFKLEtBQUcsQ0FBQyxHQUMvQyxFQUxDLEdBQUcsQ0FNTixFQWJDLEdBQUcsQ0FhRTtJQUFBRixDQUFBLE1BQUFLLEVBQUE7RUFBQTtJQUFBQSxFQUFBLEdBQUFMLENBQUE7RUFBQTtFQUFBLE9BYk5LLEVBYU07QUFBQSIsImlnbm9yZUxpc3QiOltdfQ==
