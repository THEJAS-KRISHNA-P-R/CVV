    -- =====================================================
    -- Migration: 00005_citizen_layer.sql
    -- Purpose: Implement Public Citizen Layer features
    --   1. Verified Household Anchoring
    --   2. Public Blackspot Reporting
    --   3. Municipal Fee Management
    -- Aligned with: SUCHITWA Mission, HARITHA KERALA Mission
    -- =====================================================

    -- ===========================================
    -- PART 1: ENUMS FOR NEW FEATURES
    -- ===========================================

    -- Verification status for household anchoring
    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
    END IF;
    END$$;

    -- Report categories for blackspot reporting
    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_category') THEN
        CREATE TYPE report_category AS ENUM ('dumping', 'overflow', 'hazardous', 'construction_debris', 'dead_animal', 'other');
    END IF;
    END$$;

    -- Report status
    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('open', 'investigating', 'resolved', 'rejected');
    END IF;
    END$$;

    -- Payment status
    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue', 'waived');
    END IF;
    END$$;

    -- ===========================================
    -- PART 2: UPDATE HOUSEHOLDS TABLE
    -- Add verification anchoring fields
    -- ===========================================

    -- Add verification_status column if not exists
    DO $$
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE households 
        ADD COLUMN verification_status verification_status DEFAULT 'pending';
    END IF;
    END$$;

    -- Add anchored_at timestamp (when HKS worker verified the location)
    DO $$
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' AND column_name = 'anchored_at'
    ) THEN
        ALTER TABLE households 
        ADD COLUMN anchored_at TIMESTAMPTZ;
    END IF;
    END$$;

    -- Add anchored_by (worker who performed verification)
    DO $$
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' AND column_name = 'anchored_by'
    ) THEN
        ALTER TABLE households 
        ADD COLUMN anchored_by UUID REFERENCES profiles(id);
    END IF;
    END$$;

    -- Add rejection_reason for rejected verifications
    DO $$
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'households' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE households 
        ADD COLUMN rejection_reason TEXT;
    END IF;
    END$$;

    -- ===========================================
    -- PART 3: PUBLIC REPORTS TABLE
    -- For citizen blackspot reporting
    -- ===========================================

    CREATE TABLE IF NOT EXISTS public_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reporter information
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Report details
    photo_url TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    ward INTEGER,
    
    -- Classification
    category report_category NOT NULL DEFAULT 'dumping',
    description TEXT,
    severity INTEGER DEFAULT 3 CHECK (severity BETWEEN 1 AND 5), -- 1=minor, 5=critical
    
    -- Status tracking
    status report_status DEFAULT 'open',
    assigned_to UUID REFERENCES profiles(id), -- Admin/Worker handling the report
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    resolution_photo_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Spatial index for location-based queries
    CREATE INDEX IF NOT EXISTS idx_public_reports_location 
    ON public_reports USING GIST (location);

    -- Index for status filtering
    CREATE INDEX IF NOT EXISTS idx_public_reports_status 
    ON public_reports (status);

    -- Index for reporter queries
    CREATE INDEX IF NOT EXISTS idx_public_reports_reporter 
    ON public_reports (reporter_id);

    -- Index for ward-based queries
    CREATE INDEX IF NOT EXISTS idx_public_reports_ward 
    ON public_reports (ward);

    -- Trigger for updated_at
    CREATE OR REPLACE FUNCTION update_public_reports_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_public_reports_updated_at ON public_reports;
    CREATE TRIGGER trigger_public_reports_updated_at
    BEFORE UPDATE ON public_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_public_reports_updated_at();

    -- ===========================================
    -- PART 4: USER PAYMENTS TABLE
    -- Municipal fee tracking (SUCHITWA Mission)
    -- ===========================================

    CREATE TABLE IF NOT EXISTS user_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Household reference
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL DEFAULT 50.00, -- ₹50/month as per SUCHITWA Mission
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2020),
    
    -- Status tracking
    status payment_status DEFAULT 'pending',
    
    -- Transaction details (for future payment gateway integration)
    transaction_ref TEXT,
    payment_method TEXT, -- 'cash', 'upi', 'online', 'green_credits'
    paid_at TIMESTAMPTZ,
    collected_by UUID REFERENCES profiles(id), -- HKS worker who collected cash
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one payment record per month per household
    UNIQUE(household_id, month, year)
    );

    -- Index for household payment history
    CREATE INDEX IF NOT EXISTS idx_user_payments_household 
    ON user_payments (household_id, year DESC, month DESC);

    -- Index for pending payments
    CREATE INDEX IF NOT EXISTS idx_user_payments_status 
    ON user_payments (status) WHERE status = 'pending';

    -- Trigger for updated_at
    CREATE OR REPLACE FUNCTION update_user_payments_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_user_payments_updated_at ON user_payments;
    CREATE TRIGGER trigger_user_payments_updated_at
    BEFORE UPDATE ON user_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_user_payments_updated_at();

    -- ===========================================
    -- PART 5: RLS POLICIES
    -- ===========================================

    -- Enable RLS on new tables
    ALTER TABLE public_reports ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_payments ENABLE ROW LEVEL SECURITY;

    -- ==================
    -- PUBLIC_REPORTS RLS
    -- ==================

    -- Any verified user can view all public reports (transparency)
    DROP POLICY IF EXISTS "public_reports_select_verified" ON public_reports;
    CREATE POLICY "public_reports_select_verified" ON public_reports
    FOR SELECT
    USING (
        EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid()
        )
    );

    -- Verified users can create reports
    DROP POLICY IF EXISTS "public_reports_insert_verified" ON public_reports;
    CREATE POLICY "public_reports_insert_verified" ON public_reports
    FOR INSERT
    WITH CHECK (
        auth.uid() = reporter_id
        AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid()
        )
    );

    -- Users can update their own reports (only description, before admin touches it)
    DROP POLICY IF EXISTS "public_reports_update_own" ON public_reports;
    CREATE POLICY "public_reports_update_own" ON public_reports
    FOR UPDATE
    USING (
        reporter_id = auth.uid() 
        AND status = 'open'
    )
    WITH CHECK (
        reporter_id = auth.uid()
    );

    -- Only admins can update report status and assign workers
    DROP POLICY IF EXISTS "public_reports_update_admin" ON public_reports;
    CREATE POLICY "public_reports_update_admin" ON public_reports
    FOR UPDATE
    USING (
        EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND role = 'admin'
        )
    );

    -- Users can delete their own open reports
    DROP POLICY IF EXISTS "public_reports_delete_own" ON public_reports;
    CREATE POLICY "public_reports_delete_own" ON public_reports
    FOR DELETE
    USING (
        reporter_id = auth.uid() 
        AND status = 'open'
    );

    -- ==================
    -- USER_PAYMENTS RLS
    -- ==================

    -- Users can only see their own household's payments
    DROP POLICY IF EXISTS "user_payments_select_own" ON user_payments;
    CREATE POLICY "user_payments_select_own" ON user_payments
    FOR SELECT
    USING (
        EXISTS (
        SELECT 1 FROM households 
        WHERE households.id = user_payments.household_id 
        AND households.user_id = auth.uid()
        )
    );

    -- Admins can see all payments
    DROP POLICY IF EXISTS "user_payments_select_admin" ON user_payments;
    CREATE POLICY "user_payments_select_admin" ON user_payments
    FOR SELECT
    USING (
        EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND role = 'admin'
        )
    );

    -- Workers can see payments for households they've collected from
    DROP POLICY IF EXISTS "user_payments_select_worker" ON user_payments;
    CREATE POLICY "user_payments_select_worker" ON user_payments
    FOR SELECT
    USING (
        EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND role = 'worker'
        )
        AND collected_by = auth.uid()
    );

    -- Only admins can insert payment records
    DROP POLICY IF EXISTS "user_payments_insert_admin" ON user_payments;
    CREATE POLICY "user_payments_insert_admin" ON user_payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND role IN ('admin', 'worker')
        )
    );

    -- Only admins/workers can update payment status
    DROP POLICY IF EXISTS "user_payments_update_admin" ON user_payments;
    CREATE POLICY "user_payments_update_admin" ON user_payments
    FOR UPDATE
    USING (
        EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND role IN ('admin', 'worker')
        )
    );

    -- ==================
    -- HOUSEHOLDS RLS UPDATE (for verification)
    -- ==================

    -- Workers can update verification status
    DROP POLICY IF EXISTS "households_verify_worker" ON households;
    CREATE POLICY "households_verify_worker" ON households
    FOR UPDATE
    USING (
        EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND role IN ('admin', 'worker')
        )
    );

    -- ===========================================
    -- PART 6: DATABASE FUNCTIONS
    -- ===========================================

    -- Function: Anchor household (worker verification)
    CREATE OR REPLACE FUNCTION anchor_household(
    p_household_id UUID,
    p_worker_id UUID,
    p_verified BOOLEAN DEFAULT TRUE,
    p_rejection_reason TEXT DEFAULT NULL
    )
    RETURNS households AS $$
    DECLARE
    v_household households;
    BEGIN
    -- Verify worker exists and has appropriate role
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_worker_id 
        AND role IN ('worker', 'admin')
    ) THEN
        RAISE EXCEPTION 'Only workers and admins can verify households';
    END IF;
    
    -- Update household verification
    UPDATE households
    SET
        verification_status = CASE WHEN p_verified THEN 'verified' ELSE 'rejected' END,
        anchored_at = CASE WHEN p_verified THEN NOW() ELSE NULL END,
        anchored_by = p_worker_id,
        rejection_reason = CASE WHEN NOT p_verified THEN p_rejection_reason ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_household_id
    RETURNING * INTO v_household;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Household not found';
    END IF;
    
    RETURN v_household;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Function: Get nearby blackspots for workers
    CREATE OR REPLACE FUNCTION get_nearby_blackspots(
    p_lat FLOAT,
    p_lon FLOAT,
    p_radius_km FLOAT DEFAULT 5,
    p_status report_status DEFAULT 'open'
    )
    RETURNS TABLE (
    id UUID,
    photo_url TEXT,
    category report_category,
    description TEXT,
    severity INTEGER,
    status report_status,
    reporter_name TEXT,
    created_at TIMESTAMPTZ,
    distance_meters FLOAT,
    latitude FLOAT,
    longitude FLOAT
    ) AS $$
    BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.photo_url,
        pr.category,
        pr.description,
        pr.severity,
        pr.status,
        p.full_name AS reporter_name,
        pr.created_at,
        ST_Distance(
        pr.location,
        ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
        ) AS distance_meters,
        ST_Y(pr.location::geometry) AS latitude,
        ST_X(pr.location::geometry) AS longitude
    FROM public_reports pr
    JOIN profiles p ON p.id = pr.reporter_id
    WHERE ST_DWithin(
        pr.location,
        ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
        p_radius_km * 1000
    )
    AND pr.status = p_status
    ORDER BY distance_meters ASC;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Function: Get household payment status
    CREATE OR REPLACE FUNCTION get_payment_status(p_household_id UUID)
    RETURNS TABLE (
    current_month_status payment_status,
    current_month_amount DECIMAL,
    total_pending DECIMAL,
    total_paid_this_year DECIMAL,
    last_payment_date TIMESTAMPTZ
    ) AS $$
    DECLARE
    v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
    v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    BEGIN
    RETURN QUERY
    SELECT
        COALESCE(
        (SELECT up.status FROM user_payments up 
        WHERE up.household_id = p_household_id 
        AND up.month = v_current_month 
        AND up.year = v_current_year),
        'pending'::payment_status
        ) AS current_month_status,
        COALESCE(
        (SELECT up.amount FROM user_payments up 
        WHERE up.household_id = p_household_id 
        AND up.month = v_current_month 
        AND up.year = v_current_year),
        50.00::DECIMAL
        ) AS current_month_amount,
        COALESCE(
        (SELECT SUM(up.amount) FROM user_payments up 
        WHERE up.household_id = p_household_id 
        AND up.status IN ('pending', 'overdue')),
        0::DECIMAL
        ) AS total_pending,
        COALESCE(
        (SELECT SUM(up.amount) FROM user_payments up 
        WHERE up.household_id = p_household_id 
        AND up.year = v_current_year 
        AND up.status = 'paid'),
        0::DECIMAL
        ) AS total_paid_this_year,
        (SELECT MAX(up.paid_at) FROM user_payments up 
        WHERE up.household_id = p_household_id 
        AND up.status = 'paid') AS last_payment_date;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Function: Create monthly payment records (to be called by cron job)
    CREATE OR REPLACE FUNCTION generate_monthly_payments()
    RETURNS INTEGER AS $$
    DECLARE
    v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
    v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    v_count INTEGER := 0;
    BEGIN
    -- Create payment records for all verified households that don't have one for current month
    INSERT INTO user_payments (household_id, amount, month, year, status)
    SELECT 
        h.id,
        50.00, -- Standard SUCHITWA Mission rate
        v_current_month,
        v_current_year,
        'pending'
    FROM households h
    WHERE h.verification_status = 'verified'
    AND NOT EXISTS (
        SELECT 1 FROM user_payments up
        WHERE up.household_id = h.id
        AND up.month = v_current_month
        AND up.year = v_current_year
    );
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Mark last month's pending as overdue
    UPDATE user_payments
    SET status = 'overdue'
    WHERE status = 'pending'
    AND (year < v_current_year OR (year = v_current_year AND month < v_current_month));
    
    RETURN v_count;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- ===========================================
    -- PART 7: REALTIME CONFIGURATION
    -- ===========================================

    -- Enable Realtime on public_reports for alerts
    DO $$
    BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public_reports;
    EXCEPTION
    WHEN duplicate_object THEN NULL;
    END$$;

    -- Create notification function for new blackspot reports
    CREATE OR REPLACE FUNCTION notify_new_blackspot_report()
    RETURNS TRIGGER AS $$
    BEGIN
    PERFORM pg_notify(
        'public_alerts',
        json_build_object(
        'type', 'new_blackspot',
        'report_id', NEW.id,
        'category', NEW.category,
        'ward', NEW.ward,
        'severity', NEW.severity,
        'created_at', NEW.created_at
        )::text
    );
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_notify_new_blackspot ON public_reports;
    CREATE TRIGGER trigger_notify_new_blackspot
    AFTER INSERT ON public_reports
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_blackspot_report();

    -- ===========================================
    -- PART 8: SEED DATA (For Development)
    -- ===========================================

    -- Note: Uncomment and modify UUIDs when you have actual test users

    -- Example: Generate payment records for existing verified households
    -- INSERT INTO user_payments (household_id, amount, month, year, status)
    -- SELECT id, 50.00, 2, 2026, 'pending'
    -- FROM households
    -- WHERE verification_status = 'verified'
    -- ON CONFLICT (household_id, month, year) DO NOTHING;

    -- ===========================================
    -- MIGRATION COMPLETE
    -- ===========================================

    COMMENT ON TABLE public_reports IS 'Citizen blackspot reports for non-household waste (dumping, overflow, hazardous materials)';
    COMMENT ON TABLE user_payments IS 'Municipal fee tracking for SUCHITWA Mission compliance (₹50/month household waste collection fee)';
    COMMENT ON COLUMN households.verification_status IS 'HKS worker must scan QR during first visit to anchor GPS coordinates';
    COMMENT ON COLUMN households.anchored_at IS 'Timestamp when worker verified the physical household location';
