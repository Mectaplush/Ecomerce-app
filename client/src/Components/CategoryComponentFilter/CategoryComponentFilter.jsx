import React, { useState, useEffect } from 'react';
import { Checkbox, Card, Spin, Collapse, Input } from 'antd';
import { requestGetCategoryByComponentTypes } from '../../config/request';
import classNames from 'classnames/bind';
import styles from './CategoryComponentFilter.module.scss';
import { SearchOutlined } from '@ant-design/icons';

const { Panel } = Collapse;
const cx = classNames.bind(styles);

function CategoryComponentFilter({ onChange, categoryId, filters, selectedIds = [] }) {
    const [componentGroups, setComponentGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchMap, setSearchMap] = useState({});
    const [filteredComponents, setFilteredComponents] = useState({});
    const [selectedParts, setSelectedParts] = useState([]);

    // Map component types to display names in Vietnamese
    const componentTypeLabels = {
        cpu: 'CPU',
        mainboard: 'Bo mạch chủ',
        ram: 'RAM',
        hdd: 'Ổ cứng HDD',
        ssd: 'Ổ cứng SSD',
        vga: 'Card đồ họa (VGA)',
        power: 'Nguồn máy tính',
        cooler: 'Tản nhiệt',
        case: 'Vỏ case',
        monitor: 'Màn hình',
        keyboard: 'Bàn phím',
        mouse: 'Chuột',
        headset: 'Tai nghe',
    };

    // Reset selectedParts when category changes
    useEffect(() => {
        setSelectedParts([]);
    }, [categoryId]);

    // Update selectedParts from selectedIds
    useEffect(() => {
        if (selectedIds.length === 0) {
            setSelectedParts([]);
        }
    }, [selectedIds]);

    // Hàm loại bỏ trùng lặp các component dựa trên tên
    const deduplicateComponentsByName = (components) => {
        const uniqueComponents = new Map();

        components.forEach((component) => {
            if (!component.name) return;

            // Nếu chưa có component này trong Map, thêm vào
            if (!uniqueComponents.has(component.name)) {
                uniqueComponents.set(component.name, {
                    id: component.id,
                    name: component.name,
                    type: component.type,
                    productId: component.productId,
                    // Lưu tất cả các productId có cùng tên component
                    allProductIds: [component.productId],
                });
            } else {
                // Nếu đã có, thêm productId vào mảng allProductIds
                const existing = uniqueComponents.get(component.name);
                existing.allProductIds.push(component.productId);
            }
        });

        return Array.from(uniqueComponents.values());
    };

    useEffect(() => {
        const fetchComponentParts = async () => {
            setLoading(true);
            try {
                // Nếu đã có dữ liệu filters được truyền từ component cha
                if (filters && filters.length > 0) {
                    // Tạo bản sao của filters và loại bỏ trùng lặp
                    const deduplicatedFilters = filters.map((group) => ({
                        ...group,
                        components: deduplicateComponentsByName(group.components),
                    }));

                    setComponentGroups(deduplicatedFilters);

                    // Khởi tạo các bộ lọc ban đầu
                    const filtered = {};
                    deduplicatedFilters.forEach((group) => {
                        filtered[group.type] = [...group.components];
                    });

                    setFilteredComponents(filtered);
                    setLoading(false);
                    return;
                }

                // Nếu không có filters, gọi API như trước
                const params = {};
                if (categoryId) {
                    params.categoryId = categoryId;
                }

                const result = await requestGetCategoryByComponentTypes(params);

                // Loại bỏ trùng lặp các component trong result
                const deduplicatedResult = result.map((group) => ({
                    ...group,
                    components: deduplicateComponentsByName(group.components),
                }));

                // Cấu trúc dữ liệu của các linh kiện nhóm theo loại
                setComponentGroups(deduplicatedResult);

                // Khởi tạo các bộ lọc ban đầu
                const filtered = {};
                deduplicatedResult.forEach((group) => {
                    filtered[group.type] = [...group.components];
                });

                setFilteredComponents(filtered);
            } catch (error) {
                console.error('Error fetching component parts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchComponentParts();
    }, [categoryId, filters]);

    const handleSearch = (type, searchText) => {
        // Cập nhật giá trị search trong map
        setSearchMap({
            ...searchMap,
            [type]: searchText,
        });

        // Tìm nhóm linh kiện tương ứng
        const group = componentGroups.find((g) => g.type === type);
        if (!group) return;

        // Lọc danh sách linh kiện theo từ khóa tìm kiếm
        if (!searchText) {
            setFilteredComponents({
                ...filteredComponents,
                [type]: [...group.components],
            });
            return;
        }

        const filtered = group.components.filter((part) => part.name.toLowerCase().includes(searchText.toLowerCase()));

        setFilteredComponents({
            ...filteredComponents,
            [type]: filtered,
        });
    };

    const handleComponentPartChange = (checked, partId, productIds) => {
        let newSelectedParts;

        if (checked) {
            newSelectedParts = [...selectedParts, { id: partId, productIds }];
        } else {
            newSelectedParts = selectedParts.filter((item) => item.id !== partId);
        }

        setSelectedParts(newSelectedParts);

        if (onChange) {
            // Truyền tất cả các productIds cho component cha
            const allProductIds = newSelectedParts.flatMap((item) => item.productIds);
            onChange(allProductIds);
        }
    };

    if (loading) {
        return (
            <Card className={cx('component-filter-card')} title="Linh kiện">
                <Spin />
            </Card>
        );
    }

    // Sắp xếp các loại linh kiện theo thứ tự mong muốn
    const sortedComponentGroups = [...componentGroups].sort((a, b) => {
        const order = [
            'cpu',
            'mainboard',
            'ram',
            'vga',
            'ssd',
            'hdd',
            'power',
            'cooler',
            'case',
            'monitor',
            'keyboard',
            'mouse',
            'headset',
        ];
        return order.indexOf(a.type) - order.indexOf(b.type);
    });

    return (
        <Card className={cx('component-filter-card')} title="Bộ lọc linh kiện">
            <div className={cx('filter-scroll-container')}>
                <Collapse defaultActiveKey={[]}>
                    {sortedComponentGroups.map((group) => (
                        <Panel
                            header={`${componentTypeLabels[group.type] || group.type} (${
                                group.components?.length || 0
                            })`}
                            key={group.type}
                        >
                            <Input
                                placeholder="Tìm kiếm"
                                prefix={<SearchOutlined />}
                                onChange={(e) => handleSearch(group.type, e.target.value)}
                                className={cx('search-input')}
                                value={searchMap[group.type] || ''}
                            />

                            <div className={cx('component-list')}>
                                {(filteredComponents[group.type] || []).map((part) => (
                                    <div key={part.id} className={cx('component-item')}>
                                        <Checkbox
                                            onChange={(e) =>
                                                handleComponentPartChange(e.target.checked, part.id, part.allProductIds)
                                            }
                                            checked={selectedParts.some((item) => item.id === part.id)}
                                        >
                                            {part.name}
                                        </Checkbox>
                                    </div>
                                ))}

                                {filteredComponents[group.type]?.length === 0 && (
                                    <div className={cx('no-results')}>Không tìm thấy linh kiện phù hợp</div>
                                )}
                            </div>
                        </Panel>
                    ))}
                </Collapse>
            </div>
        </Card>
    );
}

export default CategoryComponentFilter;
