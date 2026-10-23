package com.esprit.badges.security;

import com.esprit.badges.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Lit l'en-tete "Authorization: Bearer <jeton>". Si le jeton est valide, l'utilisateur est reconnu pour cette requete.
 * Le profil est relu dans la base a chaque fois : un compte supprime ou change de role est pris en compte immediatement.
 * Un jeton absent ou invalide ne bloque rien ici : ce sont les regles de SecurityConfig qui refusent (401).
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String PREFIX = "Bearer ";

    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(PREFIX)) {
            jwt.parse(header.substring(PREFIX.length()).trim())
                    .flatMap(claims -> users.findByEmail(claims.getSubject()))
                    .ifPresent(user -> {
                        AuthUser principal = new AuthUser(user.getId(), user.getEmail(), user.getRole());
                        var authority = new SimpleGrantedAuthority("ROLE_" + user.getRole().name());
                        SecurityContextHolder.getContext()
                                .setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, List.of(authority)));
                    });
        }
        chain.doFilter(request, response);
    }
}
