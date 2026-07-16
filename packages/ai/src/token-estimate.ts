import { estimateTokenCost } from '@innflow/domain';

export function estimateDeterministicTokens(
  inputText: string,
  operation: string,
  outputText: string,
): { tokenInput: number; tokenOutput: number } {
  const inputChars = inputText.length + operation.length;
  const outputChars = outputText.length;
  const tokenInput = Math.floor(inputChars / 3.7) + 42;
  const tokenOutput = Math.floor(outputChars / 3.7) + 28;
  return { tokenInput, tokenOutput };
}

export function estimateDeterministicCost(
  inputText: string,
  operation: string,
  outputText: string,
): { tokenInput: number; tokenOutput: number; estimatedCostUsd: number } {
  const { tokenInput, tokenOutput } = estimateDeterministicTokens(
    inputText,
    operation,
    outputText,
  );
  return {
    tokenInput,
    tokenOutput,
    estimatedCostUsd: estimateTokenCost(tokenInput, tokenOutput),
  };
}
