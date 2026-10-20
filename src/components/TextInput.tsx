/**
 * 텍스트 입력 (components/controls.md 'text-input')
 * 흰 면 + hairline 테두리, 포커스 시 brand-deep 2px 링.
 * 오류는 회색 문구로만 표시한다: 테두리는 그대로, 입력 아래 WarningCircle + caption 문구(둘 다 muted).
 * 사용처: LoginPage, SignupPage
 */
import type { HTMLAttributes } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

interface TextInputProps {
  /** 오류 문구와 입력을 잇는 데 쓴다. 화면 안에서 겹치지 않게 지정 */
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** 화면에 보이는 라벨이 없으므로 placeholder 가 스크린리더 이름도 겸한다 */
  placeholder: string;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  enterKeyHint?: HTMLAttributes<HTMLInputElement>['enterKeyHint'];
  /** 오류 문구. 없으면 오류 줄을 그리지 않는다 */
  error?: string;
  disabled?: boolean;
}

export default function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  inputMode,
  enterKeyHint,
  error,
  disabled = false,
}: TextInputProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        autoComplete={autoComplete}
        inputMode={inputMode}
        enterKeyHint={enterKeyHint}
        disabled={disabled}
        autoCapitalize="off"
        spellCheck={false}
        className="h-14 w-full rounded-md border-[1.5px] border-hairline bg-card px-4 text-body-md text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-deep disabled:bg-surface"
      />
      {error && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1 px-1 text-caption text-muted">
          <WarningCircle size={14} weight="regular" className="shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
