package com.akven.thesis.shop;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ShopContactRepository extends JpaRepository<ShopContact, UUID> {

    List<ShopContact> findAllByOrderByPositionAscKindAsc();

    List<ShopContact> findByActiveTrueOrderByPositionAscKindAsc();
}
