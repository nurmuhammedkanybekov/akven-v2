package com.akven.thesis.config;

import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Bridges the User entity into Spring Security. This bean plus the
 * PasswordEncoder bean in SecurityConfig is all Spring Boot needs to
 * auto-configure a working AuthenticationManager (see
 * AuthenticationConfiguration#getAuthenticationManager, used by
 * SecurityConfig#authenticationManager) — AuthController never compares
 * passwords itself, it only asks that manager to authenticate.
 *
 * A retired/deactivated account (User.active = false) is treated as
 * not-found rather than "found but rejected" — same external behavior
 * (login fails), but doesn't leak account existence through a different
 * error path.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .filter(User::isActive)
                .orElseThrow(() -> new UsernameNotFoundException("No active account for " + email));

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())))
                .build();
    }
}
