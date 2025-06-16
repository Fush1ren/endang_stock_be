import { UnitPayload } from "../../types/unit.type";

export const getUnitList = (units: UnitPayload[]) => {
    return units.map((unit) => ({
        id: unit.id_unit,
        name: unit.name,
        createdAt: unit.createdAt,
        updatedAt: unit.updatedAt,
    }));
} 