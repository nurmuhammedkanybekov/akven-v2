package com.akven.thesis.family;

import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.family.FamilyDtos.MemberInput;
import com.akven.thesis.family.FamilyDtos.MemberView;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The family a customer buys for, kept in their account so sizes are worked out once. Every call works on the signed-in
 * customer's own list only: there is no id in the request that could point at someone else's family.
 */
@Service
public class FamilyService {

    /** A large family and the grandparents fit; a shop's staff list does not belong here (that is wholesale). */
    public static final int MAX_MEMBERS = 12;

    private final FamilyMemberRepository members;
    private final UserRepository users;

    public FamilyService(FamilyMemberRepository members, UserRepository users) {
        this.members = members;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<MemberView> mine(String email) {
        return members.findByUserIdOrderByPositionAsc(user(email)).stream().map(MemberView::of).toList();
    }

    /** Replaces the whole list with the one sent, in its order. An empty list forgets the family. */
    @Transactional
    public List<MemberView> replace(String email, List<MemberInput> input) {
        UUID userId = user(email);
        members.deleteByUser(userId);
        List<FamilyMember> saved = new ArrayList<>();
        for (int i = 0; i < Math.min(input.size(), MAX_MEMBERS); i++) {
            MemberInput m = input.get(i);
            String name = m.name() == null || m.name().isBlank() ? null : m.name().strip().replaceAll("\\s+", " ");
            saved.add(new FamilyMember(userId, i, name, m.role(), m.shoeSize(), m.pairs(), m.birthday()));
        }
        return members.saveAll(saved).stream().map(MemberView::of).toList();
    }

    private UUID user(String email) {
        return users.findByEmail(email).map(User::getId).orElseThrow(() -> new NotFoundException("Account not found."));
    }
}
