import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Vérifier si l'utilisateur est banni
    if (token?.status === 'banned' && pathname !== '/banned') {
      return NextResponse.redirect(new URL('/banned', req.url));
    }

    // Empêcher les utilisateurs bannis d'accéder à d'autres pages
    if (pathname === '/banned' && token?.status !== 'banned') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Si l'utilisateur essaie d'accéder au dashboard mais n'est pas approuvé
    if (pathname.startsWith('/dashboard')) {
      if (!token || token.status !== 'approved') {
        if (token?.status === 'pending') {
          return NextResponse.redirect(new URL('/waiting', req.url));
        }
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Rediriger les utilisateurs approuvés qui vont sur / ou /waiting
    if ((pathname === '/' || pathname === '/waiting') && token?.status === 'approved') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Pages publiques
        if (pathname === '/' || pathname === '/waiting' || pathname === '/banned') {
          return true;
        }
        
        // Les autres pages nécessitent une authentification
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/waiting',
    '/banned'
  ]
};