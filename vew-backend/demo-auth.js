/**
 * Demo Authentication - Simplified for Product Demo
 * 3 pre-configured accounts with in-memory storage
 */

// Demo users (hardcoded for simplicity)
const DEMO_USERS = {
    'pm@veweb.com': {
        id: 1,
        email: 'pm@veweb.com',
        password: 'demo123',
        name: '产品经理',
        avatar: '👨‍💼'
    },
    'dev@veweb.com': {
        id: 2,
        email: 'dev@veweb.com',
        password: 'demo123',
        name: '开发工程师',
        avatar: '👨‍💻'
    },
    'boss@veweb.com': {
        id: 3,
        email: 'boss@veweb.com',
        password: 'demo123',
        name: '老板',
        avatar: '👔'
    },
    'designer@veweb.com': {
        id: 4,
        email: 'designer@veweb.com',
        password: 'demo123',
        name: '设计师',
        avatar: '🎨'
    },
    'qa@veweb.com': {
        id: 5,
        email: 'qa@veweb.com',
        password: 'demo123',
        name: '测试工程师',
        avatar: '🔍'
    },
    'marketing@veweb.com': {
        id: 6,
        email: 'marketing@veweb.com',
        password: 'demo123',
        name: '市场经理',
        avatar: '📢'
    },
    'sales@veweb.com': {
        id: 7,
        email: 'sales@veweb.com',
        password: 'demo123',
        name: '销售经理',
        avatar: '💼'
    },
    'hr@veweb.com': {
        id: 8,
        email: 'hr@veweb.com',
        password: 'demo123',
        name: 'HR经理',
        avatar: '👥'
    },
    'finance@veweb.com': {
        id: 9,
        email: 'finance@veweb.com',
        password: 'demo123',
        name: '财务经理',
        avatar: '💰'
    },
    'ceo@veweb.com': {
        id: 10,
        email: 'ceo@veweb.com',
        password: 'demo123',
        name: 'CEO',
        avatar: '👑'
    }
};

// In-memory session storage (in production, use Redis)
const sessions = new Map();

/**
 * Generate simple session token
 */
function generateToken(userId) {
    return `demo_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Demo Login
 */
export function demoLogin(email, password) {
    const user = DEMO_USERS[email];

    if (!user || user.password !== password) {
        throw new Error('邮箱或密码错误');
    }

    // Generate session token
    const token = generateToken(user.id);

    // Store session
    sessions.set(token, {
        userId: user.id,
        email: user.email,
        createdAt: Date.now()
    });

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar
        }
    };
}

/**
 * Verify session token
 */
export function verifyToken(token) {
    const session = sessions.get(token);

    if (!session) {
        return null;
    }

    // Session expires after 24 hours
    const age = Date.now() - session.createdAt;
    if (age > 24 * 60 * 60 * 1000) {
        sessions.delete(token);
        return null;
    }

    return session;
}

/**
 * Get user by session
 */
export function getUserFromToken(token) {
    const session = verifyToken(token);

    if (!session) {
        return null;
    }

    const user = Object.values(DEMO_USERS).find(u => u.id === session.userId);

    if (!user) {
        return null;
    }

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
    };
}

/**
 * Demo Middleware - Extract user from token
 */
export function demoAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const session = verifyToken(token);

    if (session) {
        req.user = { userId: session.userId, email: session.email };
    } else {
        req.user = null;
    }

    next();
}

/**
 * Require authentication
 */
export function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: '请先登录' });
    }
    next();
}

// Export demo users for reference
export const DEMO_ACCOUNTS = [
    { email: 'pm@veweb.com', password: 'demo123', name: '产品经理' },
    { email: 'dev@veweb.com', password: 'demo123', name: '开发工程师' },
    { email: 'boss@veweb.com', password: 'demo123', name: '老板' },
    { email: 'designer@veweb.com', password: 'demo123', name: '设计师' },
    { email: 'qa@veweb.com', password: 'demo123', name: '测试工程师' },
    { email: 'marketing@veweb.com', password: 'demo123', name: '市场经理' },
    { email: 'sales@veweb.com', password: 'demo123', name: '销售经理' },
    { email: 'hr@veweb.com', password: 'demo123', name: 'HR经理' },
    { email: 'finance@veweb.com', password: 'demo123', name: '财务经理' },
    { email: 'ceo@veweb.com', password: 'demo123', name: 'CEO' }
];
