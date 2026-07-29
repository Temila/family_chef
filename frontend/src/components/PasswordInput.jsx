import { useState } from 'react';
import Input from './primitives/Input';
import Icon from './primitives/Icon';

/**
 * PasswordInput — 基于 Input primitive 的密码输入框 + 可见性切换按钮
 * visibility toggle 按钮保留原样 (10-03/12 决定是否迁移至 IconButton)
 */
export default function PasswordInput({ value, onChange, placeholder, ...rest }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="password-input-field"
        {...rest}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible(!visible)}
        tabIndex={-1}
        aria-label={visible ? '隐藏密码' : '显示密码'}
      >
        <Icon name={visible ? 'visibility-off' : 'visibility'} size={20} />
      </button>
    </div>
  );
}
