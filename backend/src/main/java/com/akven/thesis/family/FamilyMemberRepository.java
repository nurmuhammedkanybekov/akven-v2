package com.akven.thesis.family;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, UUID> {

    List<FamilyMember> findByUserIdOrderByPositionAsc(UUID userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from FamilyMember m where m.userId = :userId")
    void deleteByUser(@Param("userId") UUID userId);
}
