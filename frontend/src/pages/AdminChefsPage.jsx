import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Card from '../components/primitives/Card';
import Button from '../components/primitives/Button';

export default function AdminChefsPage() {
  const { showToast } = useToast();

  const [chefs, setChefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBindModal, setShowBindModal] = useState(false);
  const [selectedChef, setSelectedChef] = useState(null);
  const [feishuId, setFeishuId] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadChefs();
  }, []);

  const loadChefs = async () => {
    try {
      setLoading(true);
      const res = await api.getChefs();
      setChefs(res || []);
    } catch (err) {
      showToast('加载厨师列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openBindModal = (chef) => {
    setSelectedChef(chef);
    setFeishuId(chef.feishu_open_id || '');
    setTestResult(null);
    setShowBindModal(true);
  };

  const handleBind = async () => {
    if (!feishuId.trim()) {
      showToast('请输入飞书 open_id', 'error');
      return;
    }
    try {
      await api.updateUser(selectedChef.id, { feishu_open_id: feishuId });
      showToast('绑定成功');
      setShowBindModal(false);
      loadChefs();
    } catch (err) {
      showToast('绑定失败', 'error');
    }
  };

  const handleTestNotify = async () => {
    if (!selectedChef?.feishu_open_id && !feishuId) {
      showToast('请先绑定飞书账号', 'error');
      return;
    }
    try {
      setTesting(true);
      setTestResult(null);
      const openId = feishuId || selectedChef.feishu_open_id;
      await api.post('/feishu/notify', {
        receive_id: openId,
        order_no: 'TEST-001',
        order_status: '测试通知',
        items: [{ name: '测试菜品', quantity: 1 }],
      });
      setTestResult({ success: true, message: '测试消息发送成功' });
      showToast('测试消息已发送');
    } catch (err) {
      setTestResult({ success: false, message: err.message || '发送失败' });
      showToast('发送失败', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="page-container">
      <Header title="厨师管理" />

      {loading ? (
        <Loading />
      ) : chefs.length === 0 ? (
        <EmptyState icon="👨‍🍳" text="暂无厨师账号，请先在用户管理中添加厨师角色" />
      ) : (
        <section className="section pt-0 pc-content-area">
          <div className="pc-data-table-wrap">
            <table className="pc-data-table">
              <thead>
                <tr>
                  <th>厨师</th>
                  <th>用户名</th>
                  <th>飞书绑定</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {chefs.map(chef => (
                  <tr key={chef.id}>
                    <td>
                      <div className="pc-user-cell">
                        <div className="avatar avatar-sm">
                          {(chef.display_name || chef.username).charAt(0).toUpperCase()}
                        </div>
                        <span className="pc-user-name">{chef.display_name || chef.username}</span>
                      </div>
                    </td>
                    <td>{chef.username}</td>
                    <td style={{ fontSize: '0.8rem', color: chef.feishu_open_id ? 'var(--md-color-primary)' : 'var(--md-color-on-surface-variant)' }}>
                      {chef.feishu_open_id ? '已绑定' : '未绑定'}
                    </td>
                    <td><Badge text={chef.is_active ? '启用' : '停用'} type={chef.is_active ? 'success' : 'danger'} /></td>
                    <td>
                      <Button variant="outlined" size="sm" onClick={() => openBindModal(chef)}>
                        {chef.feishu_open_id ? '管理绑定' : '绑定飞书'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list">
            {chefs.map(chef => (
              <Card key={chef.id} variant="elevated" style={{ marginBottom: 10 }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="avatar">
                      {(chef.display_name || chef.username).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{chef.display_name || chef.username}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)' }}>
                        @{chef.username}
                      </div>
                    </div>
                    <Badge text={chef.is_active ? '启用' : '停用'} type={chef.is_active ? 'success' : 'danger'} />
                  </div>
                  <div style={{ fontSize: '0.8rem', marginBottom: 12, color: chef.feishu_open_id ? 'var(--md-color-primary)' : 'var(--md-color-on-surface-variant)' }}>
                    飞书: {chef.feishu_open_id ? `已绑定 (${chef.feishu_open_id.substring(0, 10)}...)` : '未绑定'}
                  </div>
                  <Button
                    variant="outlined"
                    size="sm"
                    style={{ width: '100%' }}
                    onClick={() => openBindModal(chef)}
                  >
                    {chef.feishu_open_id ? '管理飞书绑定' : '绑定飞书账号'}
                  </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {showBindModal && selectedChef && (
        <div className="modal-overlay" onClick={() => setShowBindModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>飞书绑定 - {selectedChef.display_name || selectedChef.username}</h3>
              <button className="modal-close" onClick={() => setShowBindModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">飞书 open_id</label>
                <input
                  className="form-input"
                  value={feishuId}
                  onChange={(e) => setFeishuId(e.target.value)}
                  placeholder="输入飞书用户的 open_id"
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', marginTop: 4 }}>
                  在飞书开放平台获取用户的 open_id，<a href="https://open.feishu.cn/document/faq/trouble-shooting/how-to-obtain-openid" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-color-primary)' }}>查看操作指南</a>
                </div>
              </div>

              {testResult && (
                <div style={{
                  padding: 10,
                  borderRadius: 'var(--md-radius-sm)',
                  marginBottom: 12,
                  fontSize: '0.85rem',
                  background: testResult.success ? 'var(--md-color-primary-container)' : 'var(--md-color-error-container)',
                  color: testResult.success ? 'var(--md-color-primary)' : 'var(--md-color-error)',
                }}>
                  {testResult.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="tonal"
                  size="sm"
                  onClick={handleTestNotify}
                  loading={testing}
                  style={{ flex: 1 }}
                >
                  发送测试消息
                </Button>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="tonal" onClick={() => setShowBindModal(false)}>取消</Button>
              <Button variant="filled" onClick={handleBind}>保存绑定</Button>
            </div>
          </div>
        </div>
      )}

      <BottomBar />
    </div>
  );
}
