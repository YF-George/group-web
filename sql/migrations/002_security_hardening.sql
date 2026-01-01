-- ==========================================
-- 頂級資安強化版：解決所有 Search Path 警告
-- ==========================================

-- [1] 強力清除（解決依賴衝突）
DROP FUNCTION IF EXISTS public.atomic_save_member(integer, text, integer, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.set_session_nickname(text) CASCADE;
DROP FUNCTION IF EXISTS public.check_admin_access(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.manage_data_and_audit() CASCADE;
DROP FUNCTION IF EXISTS public.clean_old_audit_logs() CASCADE;

-- [2] 安全函數實作

-- A. 同步 Session 暱稱
CREATE OR REPLACE FUNCTION public.set_session_nickname(p_nickname TEXT)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog, pg_temp 
AS $$
BEGIN
    -- 使用完全限定函式名
    PERFORM pg_catalog.set_config('app.current_user_nickname', p_nickname, true);
END;
$$;

-- B. 原子化儲存成員 (核心邏輯)
CREATE OR REPLACE FUNCTION public.atomic_save_member(
    p_member_id INTEGER,
    p_new_nickname TEXT,
    p_vocation_id INTEGER,
    p_gear_score INTEGER,
    p_editor_nickname TEXT
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog, pg_temp 
AS $$
DECLARE
    v_old_record RECORD;
BEGIN
    -- 完全限定表名: public.members
    SELECT * INTO v_old_record FROM public.members WHERE id = p_member_id FOR UPDATE;

    IF v_old_record.nickname <> '待定' AND v_old_record.nickname <> p_new_nickname THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 
            'message', '存取衝突：該位置已被 「' || v_old_record.nickname || '」 佔用'
        );
    END IF;

    PERFORM pg_catalog.set_config('app.current_user_nickname', p_editor_nickname, true);

    UPDATE public.members
    SET 
        nickname = pg_catalog.COALESCE(p_new_nickname, '待定'),
        vocation_id = p_vocation_id,
        gear_score = pg_catalog.COALESCE(p_gear_score, 0),
        last_edited_by = p_editor_nickname,
        updated_at = pg_catalog.now()
    WHERE id = p_member_id;

    RETURN pg_catalog.jsonb_build_object('success', true, 'message', '儲存成功');
END;
$$;

-- C. 管理員驗證
CREATE OR REPLACE FUNCTION public.check_admin_access(p_nickname TEXT, p_password TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog, pg_temp 
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE nickname = p_nickname AND password_text = p_password
    );
END;
$$;

-- D. 清理過期日誌 (完全符合您的推薦範例)
CREATE OR REPLACE FUNCTION public.clean_old_audit_logs()
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog, pg_temp 
AS $$
BEGIN
    DELETE FROM public.audit_logs 
    WHERE changed_at < (pg_catalog.now() - interval '90 days');
END;
$$;

-- E. 自動化審計觸發器
CREATE OR REPLACE FUNCTION public.manage_data_and_audit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp 
AS $$
DECLARE
    current_user_name TEXT;
BEGIN
    current_user_name := pg_catalog.COALESCE(
        pg_catalog.current_setting('app.current_user_nickname', true), 
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.last_edited_by END,
        '未知用戶'
    );

    IF (TG_OP = 'UPDATE' OR TG_OP = 'INSERT') THEN
        NEW.updated_at = pg_catalog.now();
        NEW.last_edited_by = current_user_name;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        IF pg_catalog.to_jsonb(OLD) IS DISTINCT FROM pg_catalog.to_jsonb(NEW) THEN
            INSERT INTO public.audit_logs(table_name, record_id, changed_by, old_data, new_data)
            VALUES (TG_TABLE_NAME, OLD.id, current_user_name, pg_catalog.to_jsonb(OLD), pg_catalog.to_jsonb(NEW));
        END IF;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs(table_name, record_id, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, current_user_name, NULL, pg_catalog.to_jsonb(NEW));
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs(table_name, record_id, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, OLD.id, current_user_name, pg_catalog.to_jsonb(OLD), NULL);
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- [3] 重新綁定觸發器
CREATE TRIGGER trg_members_manage BEFORE INSERT OR UPDATE OR DELETE ON public.members FOR EACH ROW EXECUTE FUNCTION public.manage_data_and_audit();
CREATE TRIGGER trg_groups_manage BEFORE INSERT OR UPDATE OR DELETE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.manage_data_and_audit();

-- [4] 初始資料 (確保管理員在線)
INSERT INTO public.admin_users (nickname, password_text) VALUES 
('千羽夜', 'a22756403'),
('樂奈', '3034520835'),
('花瑚離', '3033069718'),
('花豆豆', 'jerry1012')
ON CONFLICT (nickname) DO UPDATE SET password_text = EXCLUDED.password_text;
